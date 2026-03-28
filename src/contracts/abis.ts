/**
 * ABIs from Hardhat `artifacts 2/` (interface artifacts — stable for frontend).
 * @see ../artifacts 2/contracts/interfaces/*.sol/*.json
 */
import type { Abi } from 'viem';
import IUniswapV3Factory from '@artifacts2/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json';
import IUniswapV3Pool from '@artifacts2/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import ISwapRouter from '@artifacts2/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';
import IERC20 from '@artifacts2/contracts/interfaces/IERC20.sol/IERC20.json';
import INonfungiblePositionManager from '@artifacts2/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json';
import ERC721 from '@artifacts2/contracts/periphery/ERC721.sol/ERC721.json';

type Artifact = { abi: Abi };

export const factoryAbi = (IUniswapV3Factory as Artifact).abi;
export const poolAbi = (IUniswapV3Pool as Artifact).abi;
export const swapRouterAbi = (ISwapRouter as Artifact).abi;
export const erc20Abi = (IERC20 as Artifact).abi;
export const positionManagerAbi = (INonfungiblePositionManager as Artifact).abi;
export const erc721Abi = (ERC721 as Artifact).abi;
