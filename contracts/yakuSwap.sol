//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract yakuSwap is Ownable {

  // Uninitialized - Default status (if swaps[index] doesn't exist, status will get this value)
  // Created - the swap was created, but the mone is still in the contract
  // Completed - the money has been sent to 'toAddress' (swap successful)
  // Cancelled - the money has been sent to 'fromAddress' (maxBlockHeight was reached)
  enum SwapStatus { Uninitialized, Created, Completed, Cancelled }

  struct Swap {
    SwapStatus status;
    uint startBlock;
    uint amount;
    bytes32 secretHash;
    address fromAddress;
    address toAddress;
    uint16 maxBlockHeight;
  }

  mapping (bytes32 => Swap) public swaps;
  uint public totalFees = 0;

  function getSwapId(bytes32 secretHash, address fromAddress) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(
      secretHash,
      fromAddress
    ));
  }

  function createSwap(bytes32 _secretHash, address _toAddress, uint16 _maxBlockHeight) payable public {
    require(msg.value >= 1000);
    require(_maxBlockHeight > 10);
    require(_toAddress != address(0) && msg.sender != address(0));

    bytes32 swapId = getSwapId(_secretHash, msg.sender);
    require(swaps[swapId].status == SwapStatus.Uninitialized);
    
    uint swapAmount = msg.value / 1000 * 993;
    Swap memory newSwap = Swap(
      SwapStatus.Created,
      block.number,
      swapAmount,
      _secretHash,
      msg.sender,
      _toAddress,
      _maxBlockHeight
    );

    swaps[swapId] = newSwap;
    totalFees += msg.value - newSwap.amount;
  }

  function completeSwap(bytes32 _swapId, string memory _secret) public {
    Swap storage swap = swaps[_swapId];

    require(swap.status == SwapStatus.Created);
    require(block.number < swap.startBlock + swap.maxBlockHeight);
    require(swap.secretHash == sha256(abi.encodePacked(_secret)));

    swap.status = SwapStatus.Completed;
    if(!payable(swap.toAddress).send(swap.amount)) {
      swap.status = SwapStatus.Created;
    }
  }

  function cancelSwap(bytes32 _swapId) public {
    Swap storage swap = swaps[_swapId];

    require(swap.status == SwapStatus.Created);
    require(block.number >= swap.startBlock + swap.maxBlockHeight);

    swap.status = SwapStatus.Cancelled;
    if(!payable(swap.fromAddress).send(swap.amount)) {
      swap.status = SwapStatus.Created;
    }
  }

  function getFees() public onlyOwner {
    uint oldTotalFees = totalFees;
    totalFees = 0;
    if(!payable(owner()).send(totalFees)) {
      totalFees = oldTotalFees;
    }
  }
}
