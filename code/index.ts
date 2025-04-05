import { PrivateKey, PublicKey } from "@bsv/sdk";
import { fetchPayUtxos, fetchTokenUtxos, TokenType, type TokenUtxo, type Utxo } from 'js-1sat-ord';

const checkIfUserHasOrdinal = async (address: string, origin: string): Promise<boolean> => {
    try {
        try {
            const response = await fetch(`https://ordinals.gorillapool.io/api/inscriptions/${origin}/latest`)
            if (response.status !== 200) {
                throw new Error('Failed to fetch data from GorilaPool API');
            }

            return (await response.json()).owner === address;
        } catch {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/token/1satordinals/${origin}/latest`)
            if (response.status !== 200) {
                throw new Error('Failed to fetch data from WhatsOnChain API');
            }

            return (await response.json()).token.ownerAddress === address;
        }
    } catch {
        return false;
    }
}

const generatePrivateKey = (): string => {
    return PrivateKey.fromRandom().toWif();
}

const privKeyToPubKey = (privKey: string): string => {
    return PrivateKey.fromWif(privKey).toPublicKey().toString();
}

const privKeyToAddress = (privKey: string): string => {
    return PrivateKey.fromWif(privKey).toAddress();
}

const pubKeyToAddress = (pubKey: string): string => {
    return PublicKey.fromString(pubKey).toAddress();
}

const getBalanceInSats = async (address: string): Promise<number> => {
    const utxos: Utxo[] = await fetchPayUtxos(address);
    let balance: number = 0;

    utxos.forEach((utxo: Utxo) => {
        balance += utxo.satoshis;
    });

    return balance;
}

const getTokenBalance = async (address: string, token: string, tokenType: 'BSV20' | 'BSV21'): Promise<number> => {
    const tokenProtocol: TokenType = tokenType === 'BSV20' ? TokenType.BSV20 : TokenType.BSV21;
    const tokenUtxos: TokenUtxo[] = await fetchTokenUtxos(tokenProtocol, token, address, 100);

    let repetitions: number = 1;

    while (tokenUtxos.length === repetitions * 100) {
        const newTokenUtxos: TokenUtxo[] = await fetchTokenUtxos(tokenProtocol, token, address, 100, repetitions * 100);
        tokenUtxos.push(...newTokenUtxos);
        repetitions++;
    }

    let balance: number = 0;

    tokenUtxos.forEach((utxo: TokenUtxo) => {
        balance += +utxo.amt;
    });

    let decimals: number;

    if (tokenType === 'BSV20') {
        decimals = (await (await fetch(`https://ordinals.gorillapool.io/api/bsv20/tick/${token}`)).json()).dec;
    } else {
        decimals = (await (await fetch(`https://ordinals.gorillapool.io/api/bsv20/id/${token}`)).json()).dec;
    }

    return balance / Math.pow(10, decimals);
}

(window as any).ord = {
    checkIfUserHasOrdinal,
    generatePrivateKey,
    privKeyToPubKey,
    privKeyToAddress,
    pubKeyToAddress,
    getBalanceInSats,
    getTokenBalance,
};