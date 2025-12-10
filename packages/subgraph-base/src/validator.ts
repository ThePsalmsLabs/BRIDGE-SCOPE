import { MessageRegistered as MessageRegisteredEvent } from "../generated/BridgeValidator/BridgeValidator"
import { MessageRegistered } from "../generated/schema"

export function handleMessageRegistered(event: MessageRegisteredEvent): void {
  let entity = new MessageRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.messageHash = event.params.messageHash
  entity.outgoingMessagePubkey = event.params.outgoingMessagePubkey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

