const { expect } = require("chai");
const { ethers } = require("hardhat");

const SECRET = "SECRET-TEST1234";
const SECRET_HASH = ethers.utils.sha256("0x" + Buffer.from(SECRET).toString('hex'));
const WRONG_SECRET = "INVALID-SECRET";
const WRONG_SECRET_HASH = ethers.utils.sha256("0x" + Buffer.from(WRONG_SECRET).toString('hex'));
const SWAP_AMOUNT = ethers.utils.parseEther("0.01337");
const SWAP_AMOUNT_AFTER_FEE = SWAP_AMOUNT.mul(993).div(1000);
const SWAP_FEE = SWAP_AMOUNT.sub(SWAP_AMOUNT_AFTER_FEE);
const MAX_BLOCK_HEIGHT = 256;

describe("YakuSwap Contract", function () {

  let yakuSwap;
  let owner;
  let addr1; // usually the sender
  let addr2; // usually the receiver
  let addr3; // some third-party
  let addrs;
  let yakuSwap1;
  let yakuSwap2;
  let yakuSwap3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    const YakuSwap = await ethers.getContractFactory('YakuSwap');
    yakuSwap = await YakuSwap.deploy();

    await yakuSwap.deployed();

    yakuSwap1 = yakuSwap.connect(addr1);
    yakuSwap2 = yakuSwap.connect(addr2);
    yakuSwap3 = yakuSwap.connect(addr3);
  });

  describe("createSwap", function () {
    it("Should create swap correctly", async function () {
      const createTx = await yakuSwap1.createSwap(
        addr2.address, SECRET_HASH, {value: SWAP_AMOUNT}
      );

      const createReceipt = await createTx.wait();
      const event = createReceipt.events.filter((x) => {return x.event == "SwapCreated"})[0];
      const blockNumber = event.args.blockNumber.toNumber();
  
      const swapHash = await yakuSwap3.getSwapHash(
        addr1.address, addr2.address, SWAP_AMOUNT, SECRET_HASH, blockNumber
      );

      const swapStatus = await yakuSwap3.swaps(swapHash);
      expect(swapStatus).to.equal(1);

      const totalFees = await yakuSwap3.totalFees();
      expect(totalFees).to.equal(0);
    });

    it("Should fail if the receiver is 0x0", async function () {
      await expect(
        yakuSwap1.createSwap(
          ethers.constants.AddressZero, SECRET_HASH, {value: SWAP_AMOUNT}
        ),
      ).to.be.revertedWith("Destination address cannot be zero");
    });
  });

  describe("completeSwap", function () {
    let blockNumber;

    beforeEach(async function () {
      const createTx = await yakuSwap1.createSwap(
        addr2.address, SECRET_HASH, {value: SWAP_AMOUNT}
      );

      const createReceipt = await createTx.wait();
      const event = createReceipt.events.filter((x) => {return x.event == "SwapCreated"})[0];
      
      blockNumber = event.args.blockNumber.toNumber();
    });

    it("Should complete swap correctly", async function () {
      const receiverBalanceBefore = await ethers.provider.getBalance(addr2.address);

      const completeTx = await yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, SECRET
      );
      
      const receiverBalanceAfter = await ethers.provider.getBalance(addr2.address);
      
      const balanceDiff = receiverBalanceAfter.sub(receiverBalanceBefore);
      expect(balanceDiff).to.equal(SWAP_AMOUNT_AFTER_FEE);
      
      const totalFees = await yakuSwap3.totalFees();
      expect(totalFees).to.equal(SWAP_FEE);
    });

    it("Should fail if the secret is invalid", async function () {
      await expect(yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, WRONG_SECRET
      )).to.be.revertedWith("Invalid swap data or swap already completed");
    });

    it("Should fail if MAX_BLOCK_HEIGHT was reached", async function () {
      for (var i = 1; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      await expect(yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, SECRET
      )).to.be.revertedWith("Deadline exceeded");
    });

    it("Should fail if the swap has been completed before", async function () {
      const completeTx = await yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, SECRET
      );

      await expect(yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, SECRET
      )).to.be.revertedWith("Invalid swap data or swap already completed");
    });
  });

  describe("cancelSwap", function () {
    let blockNumber;

    beforeEach(async function () {
      const createTx = await yakuSwap1.createSwap(
        addr2.address, SECRET_HASH, {value: SWAP_AMOUNT}
      );

      const createReceipt = await createTx.wait();
      const event = createReceipt.events.filter((x) => {return x.event == "SwapCreated"})[0];
      
      blockNumber = event.args.blockNumber.toNumber();
    });

    it("Should cancel swap correctly", async function () {
      for (var i = 1; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      const senderBalanceBefore = await ethers.provider.getBalance(addr1.address);

      const cancelTx = await yakuSwap1.cancelSwap(
        addr2.address, SWAP_AMOUNT, SECRET_HASH, blockNumber
      );
      const cancelReceipt = await cancelTx.wait();

      const senderBalanceAfter = await ethers.provider.getBalance(addr1.address);
      const txFee = cancelReceipt.gasUsed.mul(cancelReceipt.effectiveGasPrice);

      const expectedDiff = SWAP_AMOUNT.sub(txFee);
      const balanceDiff = senderBalanceAfter.sub(senderBalanceBefore);
      expect(balanceDiff).to.equal(expectedDiff);
      
      const totalFees = await yakuSwap3.totalFees();
      expect(totalFees).to.equal(0);
    });

    it("Should fail if MAX_BLOCK_HEIGHT has not been reached", async function () {
      for (var i = 2; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      await expect(yakuSwap1.cancelSwap(
        addr2.address, SWAP_AMOUNT, SECRET_HASH, blockNumber
      )).to.be.revertedWith("MAX_BLOCK_HEIGHT not exceeded");
    });

    it("Should fail if called by anyone else", async function () {
      for (var i = 1; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      await expect(yakuSwap3.cancelSwap(
        addr2.address, SWAP_AMOUNT, SECRET_HASH, blockNumber
      )).to.be.revertedWith("Invalid swap status");
    });

    it("Should fail if the swap has been completed before", async function () {
      for (var i = 2; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      await yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, SECRET
      );

      await expect(yakuSwap3.cancelSwap(
        addr2.address, SWAP_AMOUNT, SECRET_HASH, blockNumber
      )).to.be.revertedWith("Invalid swap status");
    });
  });


  describe('withdrawFees', function () {
    beforeEach(async function () {
      const createTx = await yakuSwap1.createSwap(
        addr2.address, SECRET_HASH, {value: SWAP_AMOUNT}
      );

      const createReceipt = await createTx.wait();
      const event = createReceipt.events.filter((x) => {return x.event == "SwapCreated"})[0];
      
      const blockNumber = event.args.blockNumber.toNumber();

      await yakuSwap3.completeSwap(
        addr1.address, addr2.address, SWAP_AMOUNT, blockNumber, SECRET
      );
    });

    it('Should work when called by the owner of the contract', async function () {
      const availableFees = await yakuSwap3.totalFees();
      expect(availableFees).to.equal(SWAP_FEE);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const withdrawTx = await yakuSwap.withdrawFees();
      const withdrawReceipt = await withdrawTx.wait();

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const txFee = withdrawReceipt.gasUsed.mul(withdrawReceipt.effectiveGasPrice);

      const expectedAmount = availableFees.sub(txFee);
      const balanceDiff = ownerBalanceAfter.sub(ownerBalanceBefore);
      expect(expectedAmount).to.equal(balanceDiff);

      const totalFees = await yakuSwap3.totalFees();
      expect(totalFees).to.equal(0);
    });

    it('Should work even when fees are 0', async function () {
      const availableFees = await yakuSwap3.totalFees();
      expect(availableFees).to.equal(SWAP_FEE);

      await yakuSwap.withdrawFees();
      await yakuSwap.withdrawFees();
    });

    it('Should fail when called by someone who\'s not the owner of the contract', async function () {
      await expect(
        yakuSwap1.withdrawFees(),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
