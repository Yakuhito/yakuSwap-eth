const { expect } = require("chai");
const { ethers } = require("hardhat");

const SECRET = "SECRET-TEST1234";
const SECRET_HASH = ethers.utils.sha256("0x" + Buffer.from(SECRET).toString('hex'));
const WRONG_SECRET = "INVALID-SECRET";
const WRONG_SECRET_HASH = ethers.utils.sha256("0x" + Buffer.from(WRONG_SECRET).toString('hex'));
const SWAP_AMOUNT = ethers.utils.parseEther("0.01337");
const SWAP_AMOUNT_AFTER_FEE = SWAP_AMOUNT.div(1000).mul(993);
const SWAP_FEE = SWAP_AMOUNT.sub(SWAP_AMOUNT_AFTER_FEE);
const MAX_BLOCK_HEIGHT = 240;

describe("yakuSwap Contract", function () {

  let yakuSwapContractFactory;
  let yakuSwap;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    yakuSwapContractFactory = await ethers.getContractFactory("yakuSwap");
    yakuSwap = await yakuSwapContractFactory.deploy();

    await yakuSwap.deployed();
  });

  describe("createSwap", function () {
    it("Should modify swaps and totalFees correctly", async function () {
      const transaction = await yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, MAX_BLOCK_HEIGHT, {
        value: SWAP_AMOUNT,
      });
  
      await transaction.wait();
  
      const swap = await yakuSwap.connect(addr3).swaps(SECRET_HASH);
      const totalFees = await yakuSwap.connect(addr3).totalFees();
      expect(swap.status).to.equal(1);
      expect(swap.startBlock).to.equal(await ethers.provider.getBlockNumber());
      expect(swap.amount).to.equal(SWAP_AMOUNT_AFTER_FEE);
      expect(swap.fromAddress).to.equal(addr1.address);
      expect(swap.toAddress).to.equal(addr2.address);
      expect(swap.maxBlockHeight).to.equal(MAX_BLOCK_HEIGHT);
      expect(totalFees).to.equal(SWAP_FEE);
    });

    it("Should fail if the transacted amount is less than 1000 wei", async function () {
      await expect(
        yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, MAX_BLOCK_HEIGHT, {
          value: 999,
        })
      ).to.be.revertedWith("");
    });

    it("Should fail if maxBlockHeight is less than or equal to 10", async function () {
      await expect(
        yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, 10, {
          value: SWAP_AMOUNT,
        })
      ).to.be.revertedWith("");
    });

    it("Should fail if the same secretHash is used twice", async function () {
      const transaction = await yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, MAX_BLOCK_HEIGHT, {
        value: SWAP_AMOUNT,
      });
  
      await transaction.wait();

      await expect(
        yakuSwap.connect(addr3).createSwap(SECRET_HASH, addrs[0].address, MAX_BLOCK_HEIGHT * 2, {
          value: SWAP_AMOUNT.mul(2),
        })
      ).to.be.revertedWith("");
    });

    it("Should fail if toAddress is set to 0x0", async function () {
      await expect(
        yakuSwap.connect(addr1).createSwap(SECRET_HASH, ethers.constants.AddressZero, MAX_BLOCK_HEIGHT, {
          value: SWAP_AMOUNT,
        })
      ).to.be.revertedWith("");
    });
  });

  describe("completeSwap", function () {
    beforeEach(async function () {
      const transaction = await yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, MAX_BLOCK_HEIGHT, {
        value: SWAP_AMOUNT,
      });
  
      await transaction.wait();
    });


    it("Should work if everyhting's ok", async function () {
      const transaction = await yakuSwap.connect(addr3).completeSwap(SECRET_HASH, SECRET);

      await transaction.wait();

      const swap = await yakuSwap.connect(addr3).swaps(SECRET_HASH);
      expect(swap.status).to.equal(2);
    });

    it("Should fail if secret is invalid", async function () {
      await expect(
        yakuSwap.connect(addr2).completeSwap(SECRET_HASH, WRONG_SECRET)
      ).to.be.revertedWith("");
    });

    it("Should fail if secretHash is invalid", async function () {
      await expect(
        yakuSwap.connect(addr2).completeSwap(WRONG_SECRET_HASH, WRONG_SECRET)
      ).to.be.revertedWith("");
    });

    it("Should fail if maxBlockHeight was reached", async function () {
      for(var i = 0; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }
      await expect(
        yakuSwap.connect(addr2).completeSwap(SECRET_HASH, SECRET)
      ).to.be.revertedWith("");
    });

    it("Should fail if the swap was completed", async function () {
      const transaction = await yakuSwap.connect(addr3).completeSwap(SECRET_HASH, SECRET);

      await transaction.wait();

      await expect(
        yakuSwap.connect(addr2).completeSwap(SECRET_HASH, SECRET)
      ).to.be.revertedWith("");
    });
  });

  describe("cancelSwap", function () {
    beforeEach(async function () {
      const transaction = await yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, MAX_BLOCK_HEIGHT, {
        value: SWAP_AMOUNT,
      });
  
      await transaction.wait();
    });

    it("Should work if everyhting's ok", async function () {
      for(var i = 0; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      const transaction = await yakuSwap.connect(addr3).cancelSwap(SECRET_HASH);

      await transaction.wait();

      const swap = await yakuSwap.connect(addr3).swaps(SECRET_HASH);
      expect(swap.status).to.equal(3);
    });

    it("Should fail if secretHash is invalid", async function () {
      for(var i = 0; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      await expect(
        yakuSwap.connect(addr1).cancelSwap(WRONG_SECRET_HASH)
      ).to.be.revertedWith("");
    });

    it("Should fail if maxBlockHeight hasn't been reached yet", async function () {
      await expect(
        yakuSwap.connect(addr1).cancelSwap(SECRET_HASH)
      ).to.be.revertedWith("");
    });

    it("Should fail if the swap has been completed before", async function () {
      const transaction = await yakuSwap.connect(addr3).completeSwap(SECRET_HASH, SECRET);

      await transaction.wait();

      for(var i = 0; i < MAX_BLOCK_HEIGHT; i++) {
        await ethers.provider.send('evm_mine');
      }

      await expect(
        yakuSwap.connect(addr1).cancelSwap(SECRET_HASH)
      ).to.be.revertedWith("");
    });
  });

  describe("getFees", function () {
    beforeEach(async function () {
      const transaction = await yakuSwap.connect(addr1).createSwap(SECRET_HASH, addr2.address, MAX_BLOCK_HEIGHT, {
        value: SWAP_AMOUNT,
      });
  
      await transaction.wait();

      const transaction2 = await yakuSwap.connect(addr3).completeSwap(SECRET_HASH, SECRET);

      await transaction2.wait();
    });

    it("Should work when called by the owner of the contract", async function () {
      const transaction = await yakuSwap.connect(owner).getFees();

      await transaction.wait();

      const totalFees = await yakuSwap.connect(addr3).totalFees();
      expect(totalFees).to.equal(0);
    });

    it("Should fail when called by someone who's not the owner of the contract", async function () {
      await expect(
        yakuSwap.connect(addr1).getFees()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
