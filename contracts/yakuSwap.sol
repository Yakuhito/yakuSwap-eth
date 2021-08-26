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
    address fromAddress;
    address toAddress;
    uint16 maxBlockHeight;
  }

  mapping (bytes32 => Swap) public swaps; // key = secretHash
  uint public totalFees = 0;

  function createSwap(bytes32 _secretHash, address _toAddress, uint16 _maxBlockHeight) payable public {
    require(msg.value >= 1000);
    require(_maxBlockHeight > 10);
    require(swaps[_secretHash].status == SwapStatus.Uninitialized);
    require(_toAddress != address(0) && msg.sender != address(0));

    uint swapAmount = msg.value / 1000 * 993;
    Swap memory newSwap = Swap(
      SwapStatus.Created,
      block.number,
      swapAmount,
      msg.sender,
      _toAddress,
      _maxBlockHeight
    );

    swaps[_secretHash] = newSwap;
    totalFees += msg.value - newSwap.amount;
  }

  function completeSwap(bytes32 _secretHash, string memory _secret) public {
    Swap storage swap = swaps[_secretHash];

    require(swap.status == SwapStatus.Created);
    require(block.number < swap.startBlock + swap.maxBlockHeight);
    require(_secretHash == sha256(abi.encodePacked(_secret)));

    swap.status = SwapStatus.Completed;
    payable(swap.toAddress).transfer(swap.amount);
  }

  function cancelSwap(bytes32 _secretHash) public {
    Swap storage swap = swaps[_secretHash];

    require(swap.status == SwapStatus.Created);
    require(block.number >= swap.startBlock + swap.maxBlockHeight);

    swap.status = SwapStatus.Cancelled;
    payable(swap.fromAddress).transfer(swap.amount);
  }

  function getFees() public onlyOwner {
    totalFees = 0;
    payable(owner()).transfer(totalFees);
  }
}
