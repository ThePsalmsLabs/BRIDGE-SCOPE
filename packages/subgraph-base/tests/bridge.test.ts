import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { FailedToRelayMessage } from "../generated/schema"
import { FailedToRelayMessage as FailedToRelayMessageEvent } from "../generated/Bridge/Bridge"
import { handleFailedToRelayMessage } from "../src/bridge"
import { createFailedToRelayMessageEvent } from "./bridge-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let submitter = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let messageHash = Bytes.fromI32(1234567890)
    let newFailedToRelayMessageEvent = createFailedToRelayMessageEvent(
      submitter,
      messageHash
    )
    handleFailedToRelayMessage(newFailedToRelayMessageEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("FailedToRelayMessage created and stored", () => {
    assert.entityCount("FailedToRelayMessage", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "FailedToRelayMessage",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "submitter",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "FailedToRelayMessage",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "messageHash",
      "1234567890"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
