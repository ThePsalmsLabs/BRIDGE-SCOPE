import {
  FailedToRelayMessage as FailedToRelayMessageEvent,
  Initialized as InitializedEvent,
  MessageInitiated as MessageInitiatedEvent,
  MessageSuccessfullyRelayed as MessageSuccessfullyRelayedEvent,
  OwnershipHandoverCanceled as OwnershipHandoverCanceledEvent,
  OwnershipHandoverRequested as OwnershipHandoverRequestedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PauseSwitched as PauseSwitchedEvent,
  RolesUpdated as RolesUpdatedEvent,
  TransferFinalized as TransferFinalizedEvent,
  TransferInitialized as TransferInitializedEvent
} from "../generated/Bridge/Bridge"
import {
  FailedToRelayMessage,
  Initialized,
  MessageInitiated,
  MessageSuccessfullyRelayed,
  OwnershipHandoverCanceled,
  OwnershipHandoverRequested,
  OwnershipTransferred,
  PauseSwitched,
  RolesUpdated,
  TransferFinalized,
  TransferInitialized
} from "../generated/schema"

export function handleFailedToRelayMessage(
  event: FailedToRelayMessageEvent
): void {
  let entity = new FailedToRelayMessage(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.submitter = event.params.submitter
  entity.messageHash = event.params.messageHash

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMessageInitiated(event: MessageInitiatedEvent): void {
  let entity = new MessageInitiated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.messageHash = event.params.messageHash
  entity.mmrRoot = event.params.mmrRoot
  entity.message_nonce = event.params.message.nonce
  entity.message_sender = event.params.message.sender
  entity.message_data = event.params.message.data

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMessageSuccessfullyRelayed(
  event: MessageSuccessfullyRelayedEvent
): void {
  let entity = new MessageSuccessfullyRelayed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.submitter = event.params.submitter
  entity.messageHash = event.params.messageHash

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipHandoverCanceled(
  event: OwnershipHandoverCanceledEvent
): void {
  let entity = new OwnershipHandoverCanceled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pendingOwner = event.params.pendingOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipHandoverRequested(
  event: OwnershipHandoverRequestedEvent
): void {
  let entity = new OwnershipHandoverRequested(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pendingOwner = event.params.pendingOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldOwner = event.params.oldOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePauseSwitched(event: PauseSwitchedEvent): void {
  let entity = new PauseSwitched(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.paused = event.params.paused

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRolesUpdated(event: RolesUpdatedEvent): void {
  let entity = new RolesUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.roles = event.params.roles

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransferFinalized(event: TransferFinalizedEvent): void {
  let entity = new TransferFinalized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.localToken = event.params.localToken
  entity.remoteToken = event.params.remoteToken
  entity.to = event.params.to
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransferInitialized(
  event: TransferInitializedEvent
): void {
  let entity = new TransferInitialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.localToken = event.params.localToken
  entity.remoteToken = event.params.remoteToken
  entity.to = event.params.to
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
