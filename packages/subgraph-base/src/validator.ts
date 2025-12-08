import { MessageApproved as MessageApprovedEvent } from "../generated/BridgeValidator/BridgeValidator"
import { MessageApproved } from "../generated/schema"

export function handleMessageApproved(event: MessageApprovedEvent): void {
  let entity = new MessageApproved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.messageHash = event.params.messageHash
  entity.signatures = event.params.signatures

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

