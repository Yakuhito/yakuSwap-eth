//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
  function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
  function transfer(address _to, uint256 _amount) external returns (bool);
}

contract YakuSwap is Ownable {

  // Uninitialized - Default status (if swaps[index] doesn't exist, status will get this value)
  // Created - the swap was created, but the mone is still in the contract
  // Completed - the money has been sent to 'toAddress' (swap successful)
  // Cancelled - the money has been sent to 'fromAddress' (maxBlockHeight was reached)
  enum SwapStatus {Uninitialized, Created, Completed, Cancelled}

  mapping(bytes32 => SwapStatus) public swaps;
  mapping(address => uint) public totalFees;

  uint constant public MAX_BLOCK_HEIGHT = 256;

  event SwapCreated(
    bytes32 swapHash,
    address indexed tokenAddress,
    address indexed fromAddress,
    address indexed toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  );
  
  function _getSwapHash(
    address tokenAddress,
    address fromAddress,
    address toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  ) internal view returns (bytes32) {
    return keccak256(
      abi.encode(
        tokenAddress,
        fromAddress,
        toAddress,
        amount,
        secretHash,
        blockNumber,
        block.chainid
      )
    );
  }

  function getSwapHash(
    address tokenAddress,
    address fromAddress,
    address toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  ) external view returns (bytes32) {
    return _getSwapHash(
      tokenAddress, fromAddress, toAddress, amount, secretHash, blockNumber
    );
  }

  function createSwap(address tokenAddress, address toAddress, uint amount, bytes32 secretHash) external {
    require(toAddress != address(0), "Destination address cannot be zero");
    require(tokenAddress != address(0), "Token contract address cannot be zero");

    bytes32 swapHash = _getSwapHash(
      tokenAddress,
      msg.sender,
      toAddress,
      amount,
      secretHash,
      block.number
    );

    require(swaps[swapHash] == SwapStatus.Uninitialized, "Invalid swap status");
    require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount), "Could not transfer tokens");

    swaps[swapHash] = SwapStatus.Created;
    emit SwapCreated(
      swapHash,
      tokenAddress,
      msg.sender,
      toAddress,
      amount,
      secretHash,
      block.number
    );
  }

  function completeSwap(
    address tokenAddress,
    address fromAddress,
    address toAddress,
    uint amount,
    uint blockNumber,
    string memory secret
  ) external {
    bytes32 secretHash = sha256(abi.encodePacked(secret));
    bytes32 swapHash = _getSwapHash(
      tokenAddress,
      fromAddress,
      toAddress,
      amount,
      secretHash,
      blockNumber
    );

    require(swaps[swapHash] == SwapStatus.Created, "Invalid swap data or swap already completed");
    require(block.number < blockNumber + MAX_BLOCK_HEIGHT, "Deadline exceeded");
    swaps[swapHash] = SwapStatus.Completed;

    uint swapAmount = amount * 993 / 1000;
    totalFees[tokenAddress] += amount - swapAmount;

    require(IERC20(tokenAddress).transfer(toAddress, swapAmount), "Transfer failed");
  }

  function cancelSwap(
    address tokenAddress,
    address toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  ) public {
    bytes32 swapHash = _getSwapHash(
      tokenAddress,
      msg.sender,
      toAddress,
      amount,
      secretHash,
      blockNumber
    );

    require(swaps[swapHash] == SwapStatus.Created, "Invalid swap status");
    require(block.number >= blockNumber + MAX_BLOCK_HEIGHT, "MAX_BLOCK_HEIGHT not exceeded");

    swaps[swapHash] = SwapStatus.Cancelled;
    require(IERC20(tokenAddress).transfer(msg.sender, amount), "Transfer failed");
  }

  function withdrawFees(address tokenAddress) external onlyOwner {
    uint feesToWithdraw = totalFees[tokenAddress];
    totalFees[tokenAddress] = 0;

    require(IERC20(tokenAddress).transfer(msg.sender, feesToWithdraw), "Transfer failed");
  }
}