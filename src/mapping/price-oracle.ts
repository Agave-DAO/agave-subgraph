import { Address, BigInt, Bytes, ethereum, log } from '@graphprotocol/graph-ts';

import {
  AssetPriceUpdated,
  EthPriceUpdated,
  ProphecySubmitted,
} from '../../generated/templates/FallbackPriceOracle/GenericOracleI';
import { AnswerUpdated } from '../../generated/templates/ChainlinkAggregator/IExtendedPriceAggregator';
import { formatUsdEthChainlinkPrice, zeroAddress, zeroBI } from '../utils/converters';
import {
  getChainlinkAggregator,
  getOrInitPriceOracle,
  getPriceOracleAsset,
} from '../helpers/initializers';
import { PriceOracle } from '../../generated/schema';
import { AgaveOracle } from '../../generated/AgaveOracle/AgaveOracle';
import { MOCK_USD_ADDRESS } from '../utils/constants';
import { genericPriceUpdate, usdNativePriceUpdate } from '../helpers/price-updates';

// GANACHE
export function handleAssetPriceUpdated(event: AssetPriceUpdated): void {
  let oracleAsset = getPriceOracleAsset(event.params._asset.toHexString());
  genericPriceUpdate(oracleAsset, event.params._price, event);
}

export function handleEthPriceUpdated(event: EthPriceUpdated): void {
  let priceOracle = getOrInitPriceOracle();
  usdNativePriceUpdate(priceOracle, event.params._price, event);
}

// KOVAN
export function handleProphecySubmitted(event: ProphecySubmitted): void {
  let priceOracle = getOrInitPriceOracle();

  if (priceOracle.fallbackPriceOracle.equals(event.address)) {
    // if usd mock address
    if (event.params._asset.toHexString() == MOCK_USD_ADDRESS) {
      if (priceOracle.usdPriceNativeMainSource.equals(zeroAddress())) {
        usdNativePriceUpdate(
          priceOracle,
          formatUsdEthChainlinkPrice(event.params._oracleProphecy),
          event
        );
      }
    } else {
      let oracleAsset = getPriceOracleAsset(event.params._asset.toHexString());
      if (oracleAsset.priceSource.equals(zeroAddress()) || oracleAsset.isFallbackRequired) {
        genericPriceUpdate(oracleAsset, event.params._oracleProphecy, event);
      }
    }
  }
}

function genericHandleChainlinkUSDNATIVEPrice(
  price: BigInt,
  event: ethereum.Event,
  priceOracle: PriceOracle,
  proxyPriceProvider: AgaveOracle
): void {
  if (price.gt(zeroBI())) {
    priceOracle.usdPriceNativeFallbackRequired = false;
    usdNativePriceUpdate(priceOracle, formatUsdEthChainlinkPrice(price), event);
  } else {
    priceOracle.usdPriceNativeFallbackRequired = true;
    usdNativePriceUpdate(
      priceOracle,
      formatUsdEthChainlinkPrice(
        proxyPriceProvider.getAssetPrice(Bytes.fromHexString(MOCK_USD_ADDRESS) as Address)
      ),
      event
    );
  }
}

// Ropsten and Mainnet
export function handleChainlinkAnswerUpdated(event: AnswerUpdated): void {
  let priceOracle = getOrInitPriceOracle();
  let chainlinkAggregator = getChainlinkAggregator(event.address.toHexString());

  if (priceOracle.usdPriceNativeMainSource.equals(event.address)) {
    let proxyPriceProvider = AgaveOracle.bind(priceOracle.proxyPriceProvider as Address);
    genericHandleChainlinkUSDNATIVEPrice(event.params.current, event, priceOracle, proxyPriceProvider);
  } else {
    let oracleAsset = getPriceOracleAsset(chainlinkAggregator.oracleAsset);

    // if it's correct oracle for this asset
    if (oracleAsset.priceSource.equals(event.address)) {
      // if oracle answer is valid
      if (event.params.current.gt(zeroBI())) {
        oracleAsset.isFallbackRequired = false;
        genericPriceUpdate(oracleAsset, event.params.current, event);

        let updatedTokensWithFallback = [] as string[];
        if (priceOracle.tokensWithFallback.includes(oracleAsset.id)) {
          for (let i = 0; i > priceOracle.tokensWithFallback.length; i++) {
            if ((priceOracle.tokensWithFallback as string[])[i] != oracleAsset.id) {
              updatedTokensWithFallback.push((priceOracle.tokensWithFallback as string[])[i]);
            }
          }
          priceOracle.tokensWithFallback = updatedTokensWithFallback;
          priceOracle.save();
        }
      } else {
        // oracle answer invalid, start using fallback oracle
        oracleAsset.isFallbackRequired = true;
        let proxyPriceProvider = AgaveOracle.bind(priceOracle.proxyPriceProvider as Address);
        let assetPrice = proxyPriceProvider.try_getAssetPrice(
          Bytes.fromHexString(oracleAsset.id) as Address
        );
        if (!assetPrice.reverted) {
          genericPriceUpdate(oracleAsset, assetPrice.value, event);
        } else {
          log.error(
            'OracleAssetId: {} | ProxyPriceProvider: {} | EventParamsCurrent: {} | EventAddress: {}',
            [
              oracleAsset.id,
              priceOracle.proxyPriceProvider.toHexString(),
              event.params.current.toString(),
              event.address.toHexString(),
            ]
          );
        }

        if (!priceOracle.tokensWithFallback.includes(oracleAsset.id)) {
          let updatedTokensWithFallback = priceOracle.tokensWithFallback;
          updatedTokensWithFallback.push(oracleAsset.id);
          priceOracle.tokensWithFallback = updatedTokensWithFallback;
          priceOracle.save();
        }
      }
    }
  }
}
