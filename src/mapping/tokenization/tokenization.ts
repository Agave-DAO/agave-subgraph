import {
  BalanceTransfer as ATokenTransfer,
  Mint as ATokenMint,
  Burn as ATokenBurn,
} from '../../../generated/templates/AToken/AToken';
import {
  Mint as VTokenMint,
  Burn as VTokenBurn,
  BorrowAllowanceDelegated as VBorrowAllowanceDelegated,
} from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import {
  Mint as STokenMint,
  Burn as STokenBurn,
  BorrowAllowanceDelegated as SBorrowAllowanceDelegated,
} from '../../../generated/templates/StableDebtToken/StableDebtToken';
import {
  ATokenBalanceHistoryItem,
  VTokenBalanceHistoryItem,
  STokenBalanceHistoryItem,
  UserReserve,
  Reserve,
  StableTokenDelegatedAllowance,
  VariableTokenDelegatedAllowance,
} from '../../../generated/schema';
import {
  getOrInitAToken,
  getOrInitReserve,
  getOrInitUserReserve,
  getOrInitSToken,
  getOrInitVToken,
  getOrInitUser,
  getPriceOracleAsset,
  getOrInitPriceOracle,
  getOrInitReserveParamsHistoryItem,
} from '../../helpers/initializers';
import { zeroAddress, zeroBI } from '../../utils/converters';
import { calculateUtilizationRate } from '../../helpers/reserve-logic';
import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';
import { rayDiv, rayMul } from '../../helpers/math';
import { AaveOracle } from '../../../generated/AaveOracle/AaveOracle';
import { IExtendedPriceAggregator } from '../../../generated/templates/ChainlinkAggregator/IExtendedPriceAggregator';

function saveUserReserveAHistory(
  userReserve: UserReserve,
  event: ethereum.Event,
  index: BigInt
): void {
  let aTokenBalanceHistoryItem = new ATokenBalanceHistoryItem(
    userReserve.id + event.transaction.hash.toHexString()
  );
  aTokenBalanceHistoryItem.scaledATokenBalance = userReserve.scaledATokenBalance;
  aTokenBalanceHistoryItem.currentATokenBalance = userReserve.currentATokenBalance;
  aTokenBalanceHistoryItem.userReserve = userReserve.id;
  aTokenBalanceHistoryItem.index = index;
  aTokenBalanceHistoryItem.timestamp = event.block.timestamp.toI32();
  aTokenBalanceHistoryItem.save();
}

function saveUserReserveVHistory(
  userReserve: UserReserve,
  event: ethereum.Event,
  index: BigInt
): void {
  let vTokenBalanceHistoryItem = new VTokenBalanceHistoryItem(
    userReserve.id + event.transaction.hash.toHexString()
  );

  vTokenBalanceHistoryItem.scaledVariableDebt = userReserve.scaledVariableDebt;
  vTokenBalanceHistoryItem.currentVariableDebt = userReserve.currentVariableDebt;
  vTokenBalanceHistoryItem.userReserve = userReserve.id;
  vTokenBalanceHistoryItem.index = index;
  vTokenBalanceHistoryItem.timestamp = event.block.timestamp.toI32();
  vTokenBalanceHistoryItem.save();
}

function saveUserReserveSHistory(
  userReserve: UserReserve,
  event: ethereum.Event,
  rate: BigInt
): void {
  let sTokenBalanceHistoryItem = new STokenBalanceHistoryItem(
    userReserve.id + event.transaction.hash.toHexString()
  );
  //TODO: add rserve things new stable things
  sTokenBalanceHistoryItem.principalStableDebt = userReserve.principalStableDebt;
  sTokenBalanceHistoryItem.currentStableDebt = userReserve.currentStableDebt;
  sTokenBalanceHistoryItem.userReserve = userReserve.id;
  sTokenBalanceHistoryItem.avgStableBorrowRate = rate;
  sTokenBalanceHistoryItem.timestamp = event.block.timestamp.toI32();
  sTokenBalanceHistoryItem.save();
}

function saveReserve(reserve: Reserve, event: ethereum.Event): void {
  reserve.utilizationRate = calculateUtilizationRate(reserve);
  reserve.save();

  let reserveParamsHistoryItem = getOrInitReserveParamsHistoryItem(event.transaction.hash, reserve);
  reserveParamsHistoryItem.totalScaledVariableDebt = reserve.totalScaledVariableDebt;
  reserveParamsHistoryItem.totalCurrentVariableDebt = reserve.totalCurrentVariableDebt;
  reserveParamsHistoryItem.totalPrincipalStableDebt = reserve.totalPrincipalStableDebt;
  reserveParamsHistoryItem.lifetimePrincipalStableDebt = reserve.lifetimePrincipalStableDebt;
  reserveParamsHistoryItem.lifetimeScaledVariableDebt = reserve.lifetimeScaledVariableDebt;
  reserveParamsHistoryItem.lifetimeCurrentVariableDebt = reserve.lifetimeCurrentVariableDebt;
  reserveParamsHistoryItem.lifetimeLiquidity = reserve.lifetimeLiquidity;
  reserveParamsHistoryItem.lifetimeBorrows = reserve.lifetimeBorrows;
  reserveParamsHistoryItem.lifetimeRepayments = reserve.lifetimeRepayments;
  reserveParamsHistoryItem.lifetimeWithdrawals = reserve.lifetimeWithdrawals;
  reserveParamsHistoryItem.lifetimeLiquidated = reserve.lifetimeLiquidated;
  reserveParamsHistoryItem.lifetimeFlashLoanPremium = reserve.lifetimeFlashLoanPremium;
  reserveParamsHistoryItem.lifetimeFlashLoans = reserve.lifetimeFlashLoans;
  // reserveParamsHistoryItem.lifetimeStableDebFeeCollected = reserve.lifetimeStableDebFeeCollected;
  // reserveParamsHistoryItem.lifetimeVariableDebtFeeCollected = reserve.lifetimeVariableDebtFeeCollected;
  reserveParamsHistoryItem.lifetimeReserveFactorAccrued = reserve.lifetimeReserveFactorAccrued;
  reserveParamsHistoryItem.lifetimeDepositorsInterestEarned =
    reserve.lifetimeDepositorsInterestEarned;
  reserveParamsHistoryItem.availableLiquidity = reserve.availableLiquidity;
  reserveParamsHistoryItem.totalLiquidity = reserve.totalLiquidity;
  reserveParamsHistoryItem.totalLiquidityAsCollateral = reserve.totalLiquidityAsCollateral;
  reserveParamsHistoryItem.utilizationRate = reserve.utilizationRate;
  reserveParamsHistoryItem.variableBorrowRate = reserve.variableBorrowRate;
  reserveParamsHistoryItem.variableBorrowIndex = reserve.variableBorrowIndex;
  reserveParamsHistoryItem.stableBorrowRate = reserve.stableBorrowRate;
  reserveParamsHistoryItem.liquidityIndex = reserve.liquidityIndex;
  reserveParamsHistoryItem.liquidityRate = reserve.liquidityRate;
  reserveParamsHistoryItem.totalATokenSupply = reserve.totalATokenSupply;
  reserveParamsHistoryItem.averageStableBorrowRate = reserve.averageStableRate;
  let priceOracleAsset = getPriceOracleAsset(reserve.price);
  // If we don't have a proper price or price-source for the asset, ask for the price directly from AaveOracle
  if (priceOracleAsset.priceSource.equals(zeroAddress()) && priceOracleAsset.priceInEth.isZero()) {
    let aaveOracleContract = AaveOracle.bind(Address.fromString(reserve.aToken));
    let res = aaveOracleContract.try_getAssetPrice(reserve.underlyingAsset as Address);
    if (!res.reverted) {
      priceOracleAsset.priceInEth = res.value;
      log.debug('Fetched USD price of asset {} from oracle {}', [
        reserve.price,
        aaveOracleContract._address.toHexString(),
      ]);
    } else {
      log.warning('Asset {} unrecognized by oracle {}, RPC reverted', [
        reserve.price,
        aaveOracleContract._address.toHexString(),
      ]);
    }
  }
  reserveParamsHistoryItem.priceInEth = priceOracleAsset.priceInEth;

  let priceOracle = getOrInitPriceOracle();
  let usdPriceOfNativeAsset = priceOracle.usdPriceEth;
  // If we don't have a native USD price, query the AaveOracle for the authoritative but uncached price-at-block
  if (priceOracle.usdPriceEthMainSource.equals(zeroAddress()) && usdPriceOfNativeAsset.isZero()) {
    log.debug('Current oracle is {}', [priceOracle.proxyPriceProvider.toHexString()]);
    let oracleContract = AaveOracle.bind(priceOracle.proxyPriceProvider as Address);
    let wrappedNativeAddress = oracleContract.wrappedNative();
    log.debug('Fetching chainlink source for native asset {} from oracle {}', [
      wrappedNativeAddress.toHexString(),
      priceOracle.proxyPriceProvider.toHexString(),
    ]);
    let chainLinkSource = IExtendedPriceAggregator.bind(
      oracleContract.getSourceOfAsset(wrappedNativeAddress)
    );
    log.debug('Fetched USD price of native asset {} from oracle {} source {}', [
      wrappedNativeAddress.toHexString(),
      priceOracle.proxyPriceProvider.toHexString(),
      chainLinkSource._address.toHexString(),
    ]);
    usdPriceOfNativeAsset = chainLinkSource.latestAnswer();
    log.debug('Native asset {} USD price is {}', [
      wrappedNativeAddress.toHexString(),
      usdPriceOfNativeAsset.toString(),
    ]);
  }

  reserveParamsHistoryItem.priceInUsd = reserveParamsHistoryItem.priceInEth
    .toBigDecimal()
    .div(usdPriceOfNativeAsset.toBigDecimal());

  reserveParamsHistoryItem.timestamp = event.block.timestamp.toI32();
  reserveParamsHistoryItem.save();
}

function tokenBurn(event: ethereum.Event, from: Address, value: BigInt, index: BigInt): void {
  let aToken = getOrInitAToken(event.address);
  let userReserve = getOrInitUserReserve(from, aToken.underlyingAssetAddress as Address, event);
  let poolReserve = getOrInitReserve(aToken.underlyingAssetAddress as Address, event);

  let calculatedAmount = rayDiv(value, index);

  userReserve.scaledATokenBalance = userReserve.scaledATokenBalance.minus(calculatedAmount);
  userReserve.currentATokenBalance = rayMul(userReserve.scaledATokenBalance, index);
  userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;
  userReserve.liquidityRate = poolReserve.liquidityRate;

  // TODO: review liquidity?
  poolReserve.totalDeposits = poolReserve.totalDeposits.minus(value);
  // poolReserve.availableLiquidity = poolReserve.totalDeposits
  //   .minus(poolReserve.totalPrincipalStableDebt)
  //   .minus(poolReserve.totalScaledVariableDebt);

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(value);
  poolReserve.totalATokenSupply = poolReserve.totalATokenSupply.minus(value);

  poolReserve.totalLiquidity = poolReserve.totalLiquidity.minus(value);
  poolReserve.lifetimeWithdrawals = poolReserve.lifetimeWithdrawals.plus(value);

  if (userReserve.usageAsCollateralEnabledOnUser) {
    poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.minus(value);
  }
  saveReserve(poolReserve, event);

  userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.save();
  saveUserReserveAHistory(userReserve, event, index);
}

function tokenMint(event: ethereum.Event, from: Address, value: BigInt, index: BigInt): void {
  let aToken = getOrInitAToken(event.address);
  log.info("TokenMint of aToken {}, asset {}", [event.address.toHexString(), aToken.underlyingAssetAddress.toHexString()]);
  let poolReserve = getOrInitReserve(aToken.underlyingAssetAddress as Address, event);
  poolReserve.totalATokenSupply = poolReserve.totalATokenSupply.plus(value);
  // Check if we are minting to treasury
  if (from.toHexString() != '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c') {
    let userReserve = getOrInitUserReserve(from, aToken.underlyingAssetAddress as Address, event);
    let calculatedAmount = rayDiv(value, index);

    userReserve.scaledATokenBalance = userReserve.scaledATokenBalance.plus(calculatedAmount);
    userReserve.currentATokenBalance = rayMul(userReserve.scaledATokenBalance, index);

    userReserve.liquidityRate = poolReserve.liquidityRate;
    userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;
    userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();

    userReserve.save();

    // TODO: review
    poolReserve.totalDeposits = poolReserve.totalDeposits.plus(value);
    // poolReserve.availableLiquidity = poolReserve.totalDeposits
    //   .minus(poolReserve.totalPrincipalStableDebt)
    //   .minus(poolReserve.totalScaledVariableDebt);

    poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(value);
    poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(value);
    poolReserve.lifetimeLiquidity = poolReserve.lifetimeLiquidity.plus(value);

    if (userReserve.usageAsCollateralEnabledOnUser) {
      poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.plus(value);
    }
    saveReserve(poolReserve, event);
    saveUserReserveAHistory(userReserve, event, index);
  } else {
    poolReserve.lifetimeReserveFactorAccrued = poolReserve.lifetimeReserveFactorAccrued.plus(value);
    saveReserve(poolReserve, event);
    // log.error('Minting to treasuey {} an amount of: {}', [from.toHexString(), value.toString()]);
  }
}

export function handleATokenBurn(event: ATokenBurn): void {
  tokenBurn(event, event.params.from, event.params.value, event.params.index);
}

export function handleATokenMint(event: ATokenMint): void {
  tokenMint(event, event.params.from, event.params.value, event.params.index);
}

export function handleATokenTransfer(event: ATokenTransfer): void {
  tokenBurn(event, event.params.from, event.params.value, event.params.index);
  tokenMint(event, event.params.to, event.params.value, event.params.index);

  // TODO: is this really necessary(from v1)? if we transfer aToken we are not moving the collateral (underlying token)
  let aToken = getOrInitAToken(event.address);
  let userFromReserve = getOrInitUserReserve(
    event.params.from,
    aToken.underlyingAssetAddress as Address,
    event
  );
  let userToReserve = getOrInitUserReserve(
    event.params.to,
    aToken.underlyingAssetAddress as Address,
    event
  );

  let reserve = getOrInitReserve(aToken.underlyingAssetAddress as Address, event);
  if (
    userFromReserve.usageAsCollateralEnabledOnUser &&
    !userToReserve.usageAsCollateralEnabledOnUser
  ) {
    reserve.totalLiquidityAsCollateral = reserve.totalLiquidityAsCollateral.minus(
      event.params.value
    );
    saveReserve(reserve, event);
  } else if (
    !userFromReserve.usageAsCollateralEnabledOnUser &&
    userToReserve.usageAsCollateralEnabledOnUser
  ) {
    reserve.totalLiquidityAsCollateral = reserve.totalLiquidityAsCollateral.plus(
      event.params.value
    );
    saveReserve(reserve, event);
  }
}

export function handleVariableTokenBurn(event: VTokenBurn): void {
  let vToken = getOrInitVToken(event.address);
  let from = event.params.user;
  let value = event.params.amount;
  let index = event.params.index;
  let userReserve = getOrInitUserReserve(from, vToken.underlyingAssetAddress as Address, event);
  let poolReserve = getOrInitReserve(vToken.underlyingAssetAddress as Address, event);

  let calculatedAmount = rayDiv(value, index);
  userReserve.scaledVariableDebt = userReserve.scaledVariableDebt.minus(calculatedAmount);
  userReserve.currentVariableDebt = rayMul(userReserve.scaledVariableDebt, index);
  userReserve.currentTotalDebt = userReserve.currentStableDebt.plus(
    userReserve.currentVariableDebt
  );

  poolReserve.totalScaledVariableDebt = poolReserve.totalScaledVariableDebt.minus(calculatedAmount);
  poolReserve.totalCurrentVariableDebt = rayMul(poolReserve.totalScaledVariableDebt, index);
  // poolReserve.lifetimeVariableDebtFeeCollected = poolReserve.lifetimeVariableDebtFeeCollected.plus(
  //  value.minus(calculatedAmount)
  // );

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(value);
  poolReserve.lifetimeRepayments = poolReserve.lifetimeRepayments.plus(value);

  userReserve.liquidityRate = poolReserve.liquidityRate;
  userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;
  userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.save();

  saveReserve(poolReserve, event);

  let user = getOrInitUser(from);
  if (
    userReserve.scaledVariableDebt.equals(zeroBI()) &&
    userReserve.principalStableDebt.equals(zeroBI())
  ) {
    user.borrowedReservesCount -= 1;
    user.save();
  }

  saveUserReserveVHistory(userReserve, event, index);
}

export function handleVariableTokenMint(event: VTokenMint): void {
  let vToken = getOrInitVToken(event.address);
  let poolReserve = getOrInitReserve(vToken.underlyingAssetAddress as Address, event);

  let from = event.params.from;
  if (from.toHexString() != event.params.onBehalfOf.toHexString()) {
    from = event.params.onBehalfOf;
  }

  let value = event.params.value;
  let index = event.params.index;

  let userReserve = getOrInitUserReserve(from, vToken.underlyingAssetAddress as Address, event);

  let user = getOrInitUser(event.params.from);
  if (
    userReserve.scaledVariableDebt.equals(zeroBI()) &&
    userReserve.principalStableDebt.equals(zeroBI())
  ) {
    user.borrowedReservesCount += 1;
    user.save();
  }

  let calculatedAmount = rayDiv(value, index);
  userReserve.scaledVariableDebt = userReserve.scaledVariableDebt.plus(calculatedAmount);
  userReserve.currentVariableDebt = rayMul(userReserve.scaledVariableDebt, index);

  userReserve.currentTotalDebt = userReserve.currentStableDebt.plus(
    userReserve.currentVariableDebt
  );

  userReserve.liquidityRate = poolReserve.liquidityRate;
  userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;
  userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.save();

  poolReserve.totalScaledVariableDebt = poolReserve.totalScaledVariableDebt.plus(calculatedAmount);
  poolReserve.totalCurrentVariableDebt = rayMul(poolReserve.totalScaledVariableDebt, index);

  poolReserve.lifetimeScaledVariableDebt = poolReserve.lifetimeScaledVariableDebt.plus(
    calculatedAmount
  );
  poolReserve.lifetimeCurrentVariableDebt = rayMul(poolReserve.lifetimeScaledVariableDebt, index);

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(value);
  poolReserve.lifetimeBorrows = poolReserve.lifetimeBorrows.plus(value);

  saveReserve(poolReserve, event);

  saveUserReserveVHistory(userReserve, event, index);
}

export function handleStableTokenMint(event: STokenMint): void {
  let borrowedAmount = event.params.amount;
  let sToken = getOrInitSToken(event.address);
  let from = event.params.user;
  if (from.toHexString() != event.params.onBehalfOf.toHexString()) {
    from = event.params.onBehalfOf;
  }
  let userReserve = getOrInitUserReserve(from, sToken.underlyingAssetAddress as Address, event);

  let poolReserve = getOrInitReserve(sToken.underlyingAssetAddress as Address, event);

  let user = getOrInitUser(from);
  if (
    userReserve.scaledVariableDebt.equals(zeroBI()) &&
    userReserve.principalStableDebt.equals(zeroBI())
  ) {
    user.borrowedReservesCount += 1;
    user.save();
  }

  let calculatedAmount = event.params.amount.plus(event.params.balanceIncrease);
  poolReserve.totalPrincipalStableDebt = event.params.newTotalSupply;
  poolReserve.lifetimePrincipalStableDebt = poolReserve.lifetimePrincipalStableDebt.plus(
    calculatedAmount
  );

  poolReserve.averageStableRate = event.params.avgStableRate;
  poolReserve.lifetimeBorrows = poolReserve.lifetimeBorrows.plus(borrowedAmount);

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(borrowedAmount);

  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(event.params.balanceIncrease);
  poolReserve.stableDebtLastUpdateTimestamp = event.block.timestamp.toI32();

  saveReserve(poolReserve, event);

  userReserve.principalStableDebt = userReserve.principalStableDebt.plus(calculatedAmount);
  userReserve.currentStableDebt = userReserve.principalStableDebt;
  userReserve.currentTotalDebt = userReserve.currentStableDebt.plus(
    userReserve.currentVariableDebt
  );

  userReserve.oldStableBorrowRate = userReserve.stableBorrowRate;
  userReserve.stableBorrowRate = event.params.newRate;
  userReserve.liquidityRate = poolReserve.liquidityRate;
  userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;

  userReserve.stableBorrowLastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.save();

  saveUserReserveSHistory(userReserve, event, event.params.avgStableRate);
}

export function handleStableTokenBurn(event: STokenBurn): void {
  let sTokenAddress = event.address;
  let sToken = getOrInitSToken(sTokenAddress);
  let userReserve = getOrInitUserReserve(
    event.params.user,
    sToken.underlyingAssetAddress as Address,
    event
  );
  let poolReserve = getOrInitReserve(sToken.underlyingAssetAddress as Address, event);
  let balanceIncrease = event.params.balanceIncrease;
  let amount = event.params.amount;

  poolReserve.totalPrincipalStableDebt = event.params.newTotalSupply;
  poolReserve.lifetimeRepayments = poolReserve.lifetimeRepayments.plus(amount);
  poolReserve.averageStableRate = event.params.avgStableRate;
  poolReserve.stableDebtLastUpdateTimestamp = event.block.timestamp.toI32();

  // poolReserve.availableLiquidity = poolReserve.totalDeposits
  //   .minus(poolReserve.totalPrincipalStableDebt)
  //   .minus(poolReserve.totalScaledVariableDebt);
  poolReserve.availableLiquidity = poolReserve.availableLiquidity
    .plus(amount)
    .plus(balanceIncrease);
  // poolReserve.lifetimeStableDebFeeCollected = poolReserve.lifetimeStableDebFeeCollected.plus(
  //  balanceIncrease
  // );

  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(balanceIncrease);
  poolReserve.totalATokenSupply = poolReserve.totalATokenSupply.plus(balanceIncrease);

  saveReserve(poolReserve, event);

  userReserve.principalStableDebt = userReserve.principalStableDebt
    // .minus(event.params.balanceIncrease)
    .minus(amount);
  userReserve.currentStableDebt = userReserve.principalStableDebt;
  userReserve.currentTotalDebt = userReserve.currentStableDebt.plus(
    userReserve.currentVariableDebt
  );

  userReserve.liquidityRate = poolReserve.liquidityRate;
  userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;

  userReserve.stableBorrowLastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.save();

  let user = getOrInitUser(event.params.user);
  if (
    userReserve.scaledVariableDebt.equals(zeroBI()) &&
    userReserve.principalStableDebt.equals(zeroBI())
  ) {
    user.borrowedReservesCount -= 1;
    user.save();
  }
  saveUserReserveSHistory(userReserve, event, event.params.avgStableRate);
}

export function handleStableTokenBorrowAllowanceDelegated(event: SBorrowAllowanceDelegated): void {
  let fromUser = event.params.fromUser;
  let toUser = event.params.toUser;
  let asset = event.params.asset;
  let amount = event.params.amount;

  let userReserve = getOrInitUserReserve(fromUser, asset, event);

  let delegatedAllowanceId =
    'stable' + fromUser.toHexString() + toUser.toHexString() + asset.toHexString();
  let delegatedAllowance = StableTokenDelegatedAllowance.load(delegatedAllowanceId);
  if (delegatedAllowance == null) {
    delegatedAllowance = new StableTokenDelegatedAllowance(delegatedAllowanceId);
    delegatedAllowance.fromUser = fromUser.toHexString();
    delegatedAllowance.toUser = toUser.toHexString();
    delegatedAllowance.userReserve = userReserve.id;
  }
  delegatedAllowance.amountAllowed = amount;
  delegatedAllowance.save();
}

export function handleVariableTokenBorrowAllowanceDelegated(
  event: VBorrowAllowanceDelegated
): void {
  let fromUser = event.params.fromUser;
  let toUser = event.params.toUser;
  let asset = event.params.asset;
  let amount = event.params.amount;

  let userReserve = getOrInitUserReserve(fromUser, asset, event);

  let delegatedAllowanceId =
    'variable' + fromUser.toHexString() + toUser.toHexString() + asset.toHexString();
  let delegatedAllowance = VariableTokenDelegatedAllowance.load(delegatedAllowanceId);
  if (delegatedAllowance == null) {
    delegatedAllowance = new VariableTokenDelegatedAllowance(delegatedAllowanceId);
    delegatedAllowance.fromUser = fromUser.toHexString();
    delegatedAllowance.toUser = toUser.toHexString();
    delegatedAllowance.userReserve = userReserve.id;
  }
  delegatedAllowance.amountAllowed = amount;
  delegatedAllowance.save();
}
