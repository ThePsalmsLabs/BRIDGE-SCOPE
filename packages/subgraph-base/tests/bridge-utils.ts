import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
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
} from "../generated/Bridge/Bridge"

export function createFailedToRelayMessageEvent(
  submitter: Address,
  messageHash: Bytes
): FailedToRelayMessage {
  let failedToRelayMessageEvent =
    changetype<FailedToRelayMessage>(newMockEvent())

  failedToRelayMessageEvent.parameters = new Array()

  failedToRelayMessageEvent.parameters.push(
    new ethereum.EventParam("submitter", ethereum.Value.fromAddress(submitter))
  )
  failedToRelayMessageEvent.parameters.push(
    new ethereum.EventParam(
      "messageHash",
      ethereum.Value.fromFixedBytes(messageHash)
    )
  )

  return failedToRelayMessageEvent
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  )

  return initializedEvent
}

export function createMessageInitiatedEvent(
  messageHash: Bytes,
  mmrRoot: Bytes,
  message: ethereum.Tuple
): MessageInitiated {
  let messageInitiatedEvent = changetype<MessageInitiated>(newMockEvent())

  messageInitiatedEvent.parameters = new Array()

  messageInitiatedEvent.parameters.push(
    new ethereum.EventParam(
      "messageHash",
      ethereum.Value.fromFixedBytes(messageHash)
    )
  )
  messageInitiatedEvent.parameters.push(
    new ethereum.EventParam("mmrRoot", ethereum.Value.fromFixedBytes(mmrRoot))
  )
  messageInitiatedEvent.parameters.push(
    new ethereum.EventParam("message", ethereum.Value.fromTuple(message))
  )

  return messageInitiatedEvent
}

export function createMessageSuccessfullyRelayedEvent(
  submitter: Address,
  messageHash: Bytes
): MessageSuccessfullyRelayed {
  let messageSuccessfullyRelayedEvent =
    changetype<MessageSuccessfullyRelayed>(newMockEvent())

  messageSuccessfullyRelayedEvent.parameters = new Array()

  messageSuccessfullyRelayedEvent.parameters.push(
    new ethereum.EventParam("submitter", ethereum.Value.fromAddress(submitter))
  )
  messageSuccessfullyRelayedEvent.parameters.push(
    new ethereum.EventParam(
      "messageHash",
      ethereum.Value.fromFixedBytes(messageHash)
    )
  )

  return messageSuccessfullyRelayedEvent
}

export function createOwnershipHandoverCanceledEvent(
  pendingOwner: Address
): OwnershipHandoverCanceled {
  let ownershipHandoverCanceledEvent =
    changetype<OwnershipHandoverCanceled>(newMockEvent())

  ownershipHandoverCanceledEvent.parameters = new Array()

  ownershipHandoverCanceledEvent.parameters.push(
    new ethereum.EventParam(
      "pendingOwner",
      ethereum.Value.fromAddress(pendingOwner)
    )
  )

  return ownershipHandoverCanceledEvent
}

export function createOwnershipHandoverRequestedEvent(
  pendingOwner: Address
): OwnershipHandoverRequested {
  let ownershipHandoverRequestedEvent =
    changetype<OwnershipHandoverRequested>(newMockEvent())

  ownershipHandoverRequestedEvent.parameters = new Array()

  ownershipHandoverRequestedEvent.parameters.push(
    new ethereum.EventParam(
      "pendingOwner",
      ethereum.Value.fromAddress(pendingOwner)
    )
  )

  return ownershipHandoverRequestedEvent
}

export function createOwnershipTransferredEvent(
  oldOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("oldOwner", ethereum.Value.fromAddress(oldOwner))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPauseSwitchedEvent(paused: boolean): PauseSwitched {
  let pauseSwitchedEvent = changetype<PauseSwitched>(newMockEvent())

  pauseSwitchedEvent.parameters = new Array()

  pauseSwitchedEvent.parameters.push(
    new ethereum.EventParam("paused", ethereum.Value.fromBoolean(paused))
  )

  return pauseSwitchedEvent
}

export function createRolesUpdatedEvent(
  user: Address,
  roles: BigInt
): RolesUpdated {
  let rolesUpdatedEvent = changetype<RolesUpdated>(newMockEvent())

  rolesUpdatedEvent.parameters = new Array()

  rolesUpdatedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  rolesUpdatedEvent.parameters.push(
    new ethereum.EventParam("roles", ethereum.Value.fromUnsignedBigInt(roles))
  )

  return rolesUpdatedEvent
}

export function createTransferFinalizedEvent(
  localToken: Address,
  remoteToken: Bytes,
  to: Address,
  amount: BigInt
): TransferFinalized {
  let transferFinalizedEvent = changetype<TransferFinalized>(newMockEvent())

  transferFinalizedEvent.parameters = new Array()

  transferFinalizedEvent.parameters.push(
    new ethereum.EventParam(
      "localToken",
      ethereum.Value.fromAddress(localToken)
    )
  )
  transferFinalizedEvent.parameters.push(
    new ethereum.EventParam(
      "remoteToken",
      ethereum.Value.fromFixedBytes(remoteToken)
    )
  )
  transferFinalizedEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferFinalizedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return transferFinalizedEvent
}

export function createTransferInitializedEvent(
  localToken: Address,
  remoteToken: Bytes,
  to: Bytes,
  amount: BigInt
): TransferInitialized {
  let transferInitializedEvent = changetype<TransferInitialized>(newMockEvent())

  transferInitializedEvent.parameters = new Array()

  transferInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "localToken",
      ethereum.Value.fromAddress(localToken)
    )
  )
  transferInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "remoteToken",
      ethereum.Value.fromFixedBytes(remoteToken)
    )
  )
  transferInitializedEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromFixedBytes(to))
  )
  transferInitializedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return transferInitializedEvent
}
