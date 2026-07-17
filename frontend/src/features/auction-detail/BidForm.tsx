import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import styled from "styled-components";
import {
  getBidValidationMessage,
  minimumAllowedBid,
  validateBidAmount,
} from "../../domain/bid/validateBidAmount";
import {
  constrainBidderNameInput,
  MAX_BIDDER_LENGTH,
  parseBidderName,
} from "../../domain/bid/sanitizeBidderName";
import {
  loadBidderName,
  saveBidderName,
} from "../../shared/storage/bidderStorage";
import { getBidErrorMessage, usePlaceBid } from "./usePlaceBid";
import { useBidStream } from "../../app/BidStreamProvider";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 420px;
`;

type BidFormProps = {
  auctionId: string;
  currentBid: number;
  startPrice: number;
  disabled: boolean;
};

export function BidForm({
  auctionId,
  currentBid,
  startPrice,
  disabled,
}: BidFormProps) {
  const minBid = minimumAllowedBid(currentBid, startPrice);
  const [bidder, setBidder] = useState(loadBidderName());
  const [amount, setAmount] = useState<number | null>(minBid);
  const [localError, setLocalError] = useState("");
  const mutation = usePlaceBid(auctionId);
  const { enableNotificationSound } = useBidStream();

  useEffect(() => {
    setAmount((previous) => {
      if (previous === null || previous < minBid) {
        return minBid;
      }
      return previous;
    });
  }, [minBid]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");
    enableNotificationSound();

    try {
      const cleanName = parseBidderName(bidder);
      saveBidderName(cleanName);
      const validAmount = validateBidAmount(amount, currentBid, startPrice);
      mutation.mutate({
        auctionId,
        bidder: cleanName,
        amount: validAmount,
      });
    } catch (error) {
      setLocalError(getBidValidationMessage(error));
    }
  };

  const serverError = mutation.isError
    ? getBidErrorMessage(mutation.error)
    : "";

  return (
    <Form onSubmit={onSubmit}>
      <label htmlFor="bidder">Your name</label>
      <InputText
        id="bidder"
        value={bidder}
        maxLength={MAX_BIDDER_LENGTH}
        keyfilter={/[^\u0000-\u001F\u007F]/}
        onChange={(e) => setBidder(constrainBidderNameInput(e.target.value))}
        disabled={disabled || mutation.isPending}
      />
      <label htmlFor="amount">Bid amount ($)</label>
      <InputNumber
        inputId="amount"
        value={amount}
        onValueChange={(e) => setAmount(e.value ?? null)}
        min={minBid}
        max={Number.MAX_SAFE_INTEGER}
        step={1}
        minFractionDigits={0}
        maxFractionDigits={0}
        disabled={disabled || mutation.isPending}
        mode="decimal"
        useGrouping={false}
        allowEmpty
      />
      {(localError || serverError) && (
        <span role="alert" style={{ color: "#b91c1c" }}>
          {localError || serverError}
        </span>
      )}
      <Button
        type="submit"
        label={mutation.isPending ? "Placing bid…" : "Place bid"}
        disabled={disabled || mutation.isPending}
        icon={mutation.isPending ? undefined : "pi pi-check"}
      />
      {mutation.isPending && (
        <ProgressSpinner style={{ width: "32px", height: "32px" }} />
      )}
    </Form>
  );
}
