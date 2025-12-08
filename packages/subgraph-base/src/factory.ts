import { TwinCreated as TwinCreatedEvent } from "../generated/CrossChainERC20Factory/CrossChainERC20Factory"
import { TwinCreated } from "../generated/schema"

export function handleTwinCreated(event: TwinCreatedEvent): void {
  let entity = new TwinCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.owner = event.params.owner
  entity.twin = event.params.twin
  entity.remoteToken = event.params.remoteToken
  entity.localToken = event.params.localToken

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

