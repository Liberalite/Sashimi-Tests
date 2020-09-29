const SashimiToken = artifacts.require('./SashimiToken')
const MockERC20 = artifacts.require('./MockERC20')
const MasterChef = artifacts.require('./MasterChef')
const WETH9 = artifacts.require('./WETH9')
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');

const Web3 = require('web3');
const web3 = new Web3();
const web3ToWei = (amount) => web3.utils.toWei((amount).toString(), "ether");

module.exports = function (deployer, network, accounts) {
    const DEV = accounts[0];
    const VESTING = accounts[1];
    deployer.then(async () => {
        try {
            await deployer.deploy(SashimiToken);
            await deployer.deploy(MockERC20);
            const SashimiTokenInstance = await SashimiToken.deployed();
            const MockERC20Instance = await MockERC20.deployed();
            console.log(`SashimiTokenInstance: ${SashimiTokenInstance.address}`)
            console.log(`MockERC20Instance: ${MockERC20Instance.address}`)

            // DEPLOY MASTERCHEF
            await deployer.deploy(MasterChef, SashimiTokenInstance.address, '100', '21229900', '21239779');
            const MasterChefInstance = await MasterChef.deployed();
            console.log(`MasterChefInstance: ${MasterChefInstance.address}`);

            // INITIAL SASHIMI
            console.log(`Balance SASHIMI DEV before: ${await SashimiTokenInstance.balanceOf(DEV)}`)
            await SashimiTokenInstance.mint(DEV, '10000000000000000000000000', { from: DEV }) // - 10M
            await SashimiTokenInstance.mint(VESTING, '10000000000000000000000000', { from: DEV }) // - 10M
            await MockERC20Instance.mint(DEV, '10000000000000000000000000', { from: DEV }) // - 10M
            await MockERC20Instance.mint(VESTING, '10000000000000000000000000', { from: DEV }) // - 10M
            console.log(`Balance SASHIMI DEV after: ${await SashimiTokenInstance.balanceOf(DEV)}`)

            // TRANSFER OWNERSHIP TO MASTERCHEF
            await SashimiTokenInstance.transferOwnership(MasterChefInstance.address, { from: DEV });
            await MockERC20Instance.transferOwnership(MasterChefInstance.address, { from: DEV });

            let UniswapV2FactoryInstance, WETH9Instance;
            let SASHIMI_ETH, MOCKERC20_ETH, TOGETHER;
            if (network == 'kovan') {

                // CONNECT TO UNISWAP FACTORY AND ROUTER CONTRACTS
                UniswapV2FactoryInstance = await UniswapV2Factory.at('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'); // UNISWAP V2 FACTORY ADDRESS

                // ADD WETH BALANCE
                WETH9Instance = await WETH9.at('0xd0A1E359811322d97991E03f863a0C30C2cF029C'); // KOVAN WETH ADDRESS
                if (await WETH9Instance.balanceOf(DEV) < 1e17) {
                    await WETH9Instance.deposit({ from: DEV, value: web3ToWei(1) })
                } else if (await WETH9Instance.balanceOf(VESTING) < 1e17) {
                    await WETH9Instance.deposit({ from: VESTING, value: web3ToWei(1) })
                }
                console.log(`Just passed WETH Deposit`)

                // CREATE 3 POOLS - First Pool > Sashimi-Weth
                SASHIMI_ETH = await UniswapV2Pair.at((await UniswapV2FactoryInstance.createPair(SashimiTokenInstance.address, WETH9Instance.address)).logs[0].args.pair);
                MOCKERC20_ETH = await UniswapV2Pair.at((await UniswapV2FactoryInstance.createPair(MockERC20Instance.address, WETH9Instance.address)).logs[0].args.pair);
                TOGETHER = await UniswapV2Pair.at((await UniswapV2FactoryInstance.createPair(SashimiTokenInstance.address, MockERC20Instance.address)).logs[0].args.pair);
                console.log(`Successfully created all 3 pairs`)

                // First Pool => SASHIMI-WETH => DEV ACCOUNT
                await SashimiTokenInstance.transfer(SASHIMI_ETH.address, '70000000000000000000', { from: DEV }); // 70 SUSHI
                await WETH9Instance.transfer(SASHIMI_ETH.address, '1000000000000000', { from: DEV }); // 0.001 WETH
                await SASHIMI_ETH.mint(DEV);
                // First Pool => SASHIMI-WETH => VESTING ACCOUNT
                await SashimiTokenInstance.transfer(SASHIMI_ETH.address, '70000000000000000000', { from: VESTING }); // 70 SUSHI
                await WETH9Instance.transfer(SASHIMI_ETH.address, '1000000000000000', { from: VESTING }); // 0.001 WETH
                await SASHIMI_ETH.mint(VESTING);
                console.log(`SUSHI_WETH Address: ${SASHIMI_ETH.address}`);

                // Second Pool => MOCKERC20-WETH => DEV ACCOUNT
                await MockERC20Instance.transfer(MOCKERC20_ETH.address, '70000000000000000000', { from: DEV }); // 70 MOCKERC20
                await WETH9Instance.transfer(MOCKERC20_ETH.address, '1000000000000000', { from: DEV }); // 0.001 WETH
                await MOCKERC20_ETH.mint(DEV);
                // Second Pool => MOCKERC20-WETH => VESTING ACCOUNT
                await MockERC20Instance.transfer(MOCKERC20_ETH.address, '70000000000000000000', { from: VESTING }); // 70 MOCKERC20
                await WETH9Instance.transfer(MOCKERC20_ETH.address, '1000000000000000', { from: VESTING }); // 0.001 WETH
                await MOCKERC20_ETH.mint(VESTING);
                console.log(`MOCKERC20_WETH VESTING Address: ${MOCKERC20_ETH.address}`)

                // Third Pool => SASHIMI-MOCKERC20 => DEV ACCOUNT
                await MockERC20Instance.transfer(TOGETHER.address, '70000000000000000000', { from: DEV }); // 70 MOCKERC20
                await SashimiTokenInstance.transfer(TOGETHER.address, '70000000000000000000', { from: DEV }); // 70 SUSHI
                await TOGETHER.mint(DEV);
                // Third Pool => SASHIMI-MOCKERC20 => VESTING ACCOUNT
                await SashimiTokenInstance.transfer(TOGETHER.address, '70000000000000000000', { from: VESTING }); // 70 SUSHI
                await MockERC20Instance.transfer(TOGETHER.address, '70000000000000000000', { from: VESTING }); // 70 MOCKERC20
                await TOGETHER.mint(VESTING);
                console.log(`MOCKERC20_SUSHI Address: ${TOGETHER.address}`)

                // ADD ALLOCATION POINTS TO MASTERCHEF
                await MasterChefInstance.add('3000', SASHIMI_ETH.address, true);
                await MasterChefInstance.add('2000', MOCKERC20_ETH.address, true);
                await MasterChefInstance.add('5000', TOGETHER.address, true);

                await SASHIMI_ETH.approve(MasterChefInstance.address, '5000000000000000000000000', { from: DEV }); // 5M
                await MOCKERC20_ETH.approve(MasterChefInstance.address, '5000000000000000000000000', { from: DEV }); // 5M
                await TOGETHER.approve(MasterChefInstance.address, '9000000000000000000000000', { from: DEV }); // 9M

                await SASHIMI_ETH.approve(MasterChefInstance.address, '5000000000000000000000000', { from: VESTING }); // 5M
                await MOCKERC20_ETH.approve(MasterChefInstance.address, '5000000000000000000000000', { from: VESTING }); // 5M
                await TOGETHER.approve(MasterChefInstance.address, '9000000000000000000000000', { from: VESTING }); // 9M

                await MasterChefInstance.deposit(0, '264575131106458059', { from: DEV });
                await MasterChefInstance.deposit(0, '264575131106458059', { from: VESTING });
                await MasterChefInstance.deposit(1, '264575131106458059', { from: DEV });
                await MasterChefInstance.deposit(1, '264575131106458059', { from: VESTING });
                await MasterChefInstance.deposit(2, '69999999999999999000', { from: DEV });
                await MasterChefInstance.deposit(2, '69999999999999999000', { from: VESTING });
            }

            console.log(`Successfully deployed the project to ${network}. `)

        } catch (e) {
            console.log(e);
        }

    })
}
