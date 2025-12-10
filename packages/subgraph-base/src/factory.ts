import { CrossChainERC20Created as CrossChainERC20CreatedEvent } from "../generated/CrossChainERC20Factory/CrossChainERC20Factory"
import { CrossChainERC20Created } from "../generated/schema"

export function handleCrossChainERC20Created(event: CrossChainERC20CreatedEvent): void {
  let entity = new CrossChainERC20Created(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.localToken = event.params.localToken
  entity.remoteToken = event.params.remoteToken
  entity.deployer = event.params.deployer

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

