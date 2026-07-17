import { useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import styled from "styled-components";
import {
  constrainBidAmountInput,
  getBidAmountErrorMessage,
  getBidValidationMessage,
  isBidAmountValid,
  MAX_BID_AMOUNT_DIGITS,
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
  max-width: 280px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;

  label {
    font-size: 0.875rem;
    color: #475569;
  }

  .p-inputtext {
    width: 100%;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ErrorText = styled.span`
  color: #b91c1c;
  font-size: 0.875rem;
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
  const [amountText, setAmountText] = useState(String(minBid));
  const [localError, setLocalError] = useState("");
  const mutation = usePlaceBid(auctionId);
  const { enableNotificationSound } = useBidStream();

  const amountReady = isBidAmountValid(amountText, currentBid, startPrice);
  const amountHint = getBidAmountErrorMessage(
    amountText,
    currentBid,
    startPrice,
  );
  const canSubmit = !disabled && !mutation.isPending && amountReady;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");
    if (!canSubmit) {
      return;
    }
    enableNotificationSound();

    try {
      const cleanName = parseBidderName(bidder);
      saveBidderName(cleanName);
      const validAmount = validateBidAmount(amountText, currentBid, startPrice);
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
  const formError = localError || serverError || amountHint;

  return (
    <Form onSubmit={onSubmit}>
      <Field>
        <label htmlFor="bidder">Your name</label>
        <InputText
          id="bidder"
          value={bidder}
          maxLength={MAX_BIDDER_LENGTH}
          keyfilter={/[^\u0000-\u001F\u007F]/}
          onChange={(e) => setBidder(constrainBidderNameInput(e.target.value))}
          disabled={disabled || mutation.isPending}
        />
      </Field>
      <Field>
        <label htmlFor="amount">Bid amount ($)</label>
        <InputText
          id="amount"
          value={amountText}
          maxLength={MAX_BID_AMOUNT_DIGITS}
          keyfilter="int"
          inputMode="numeric"
          onChange={(e) =>
            setAmountText(constrainBidAmountInput(e.target.value))
          }
          disabled={disabled || mutation.isPending}
          aria-invalid={Boolean(amountHint)}
          aria-describedby={amountHint ? "amount-error" : undefined}
        />
      </Field>
      {formError && (
        <ErrorText id="amount-error" role="alert">
          {formError}
        </ErrorText>
      )}
      <Actions>
        <Button
          type="submit"
          label={mutation.isPending ? "Placing bid…" : "Place bid"}
          disabled={!canSubmit}
          icon={mutation.isPending ? undefined : "pi pi-check"}
        />
        {mutation.isPending && (
          <ProgressSpinner style={{ width: "28px", height: "28px" }} />
        )}
      </Actions>
    </Form>
  );
}
