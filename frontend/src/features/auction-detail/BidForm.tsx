import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import styled from 'styled-components';
import { validateBidAmount } from '../../domain/bid/validateBidAmount';
import { isBidderNameValid, sanitizeBidderName } from '../../domain/bid/sanitizeBidderName';
import { loadBidderName, saveBidderName } from '../../shared/storage/bidderStorage';
import { getBidErrorMessage, usePlaceBid } from './usePlaceBid';
import { useBidStream } from '../../app/BidStreamProvider';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 420px;
`;

type BidFormProps = {
  auctionId: string;
  currentBid: number;
  disabled: boolean;
};

export function BidForm({ auctionId, currentBid, disabled }: BidFormProps) {
  const [bidder, setBidder] = useState(loadBidderName());
  const [amount, setAmount] = useState<number | null>(currentBid + 5);
  const [localError, setLocalError] = useState<string | null>(null);
  const mutation = usePlaceBid(auctionId);
  const { enableNotificationSound } = useBidStream();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    enableNotificationSound();

    const cleanName = sanitizeBidderName(bidder);
    if (!isBidderNameValid(cleanName)) {
      setLocalError('Enter your bidder name.');
      return;
    }
    saveBidderName(cleanName);

    const validation = validateBidAmount(amount, currentBid);
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    mutation.mutate({
      auctionId,
      bidder: cleanName,
      amount: validation.amount,
    });
  };

  const serverError = mutation.isError ? getBidErrorMessage(mutation.error) : null;

  return (
    <Form onSubmit={onSubmit}>
      <label htmlFor="bidder">Your name</label>
      <InputText
        id="bidder"
        value={bidder}
        onChange={(e) => setBidder(e.target.value)}
        disabled={disabled || mutation.isPending}
      />
      <label htmlFor="amount">Bid amount ($)</label>
      <InputNumber
        inputId="amount"
        value={amount}
        onValueChange={(e) => setAmount(e.value ?? null)}
        min={currentBid + 1}
        disabled={disabled || mutation.isPending}
        mode="decimal"
        useGrouping={false}
      />
      {(localError || serverError) && (
        <span role="alert" style={{ color: '#b91c1c' }}>
          {localError ?? serverError}
        </span>
      )}
      <Button
        type="submit"
        label={mutation.isPending ? 'Placing bid…' : 'Place bid'}
        disabled={disabled || mutation.isPending}
        icon={mutation.isPending ? undefined : 'pi pi-check'}
      />
      {mutation.isPending && <ProgressSpinner style={{ width: '32px', height: '32px' }} />}
    </Form>
  );
}
