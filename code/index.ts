import { PrivateKey, PublicKey, Transaction } from "@bsv/sdk";
import { fetchPayUtxos, fetchTokenUtxos, sendOrdinals, sendUtxos, TokenType, transferOrdTokens, type TokenUtxo, type Utxo } from 'js-1sat-ord';

const checkIfUserHasOrdinal = async (address: string, origin: string): Promise<boolean> => {
    try {
        try {
            const response = await fetch(`https://ordinals.gorillapool.io/api/inscriptions/${origin}/latest`);
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
};

const generatePrivateKey = (): string => {
    return PrivateKey.fromRandom().toWif();
}

const privKeyToPubKey = (privKey: string): string => {
    return PrivateKey.fromWif(privKey).toPublicKey().toString();
};

const privKeyToAddress = (privKey: string): string => {
    return PrivateKey.fromWif(privKey).toAddress();
};

const pubKeyToAddress = (pubKey: string): string => {
    return PublicKey.fromString(pubKey).toAddress();
};

const getBalanceInSats = async (address: string): Promise<number> => {
    const utxos: Utxo[] = await fetchPayUtxos(address);
    let balance: number = 0;

    utxos.forEach((utxo: Utxo) => {
        balance += utxo.satoshis;
    });

    return balance;
};

const decimals = async (token: string, tokenType: 'BSV20' | 'BSV21'): Promise<number> => {
    let decimals: number;

    if (tokenType === 'BSV20') {
        decimals = (await (await fetch(`https://ordinals.gorillapool.io/api/bsv20/tick/${token}`)).json()).dec;
    } else {
        decimals = (await (await fetch(`https://ordinals.gorillapool.io/api/bsv20/id/${token}`)).json()).dec;
    }

    return decimals;
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
    
    return balance / Math.pow(10, await decimals(token, tokenType));
};

const sendBsv = async (sats: number, privKey: string, toAddress: string): Promise<void> => {
    const utxos: Utxo[] = await fetchPayUtxos(privKeyToAddress(privKey));
    const key: PrivateKey = PrivateKey.fromWif(privKey);

    const tx: Transaction = (await sendUtxos({
        utxos,
        paymentPk: key,
        payments: [{to: toAddress, amount: sats}],
        satsPerKb: 1,
    })).tx;

    await tx.broadcast();
};

const sendToken = async (tokenAmount: number, tokenID: string, privKey: string, fundPrivKey: string, toAddress: string, tokenProtocol: 'BSV20' | 'BSV21'): Promise<void> => {
    const tx: Transaction = (await transferOrdTokens({
        protocol: tokenProtocol === 'BSV20' ? TokenType.BSV20 : TokenType.BSV21,
        tokenID,
        decimals: await decimals(tokenID, tokenProtocol),
        utxos: await fetchPayUtxos(privKeyToAddress(fundPrivKey)),
        inputTokens: await fetchTokenUtxos(tokenProtocol === 'BSV20' ? TokenType.BSV20 : TokenType.BSV21, tokenID, privKeyToAddress(privKey)),
        distributions: [{address: toAddress, tokens: tokenAmount * Math.pow(10, await decimals(tokenID, tokenProtocol))}],
        satsPerKb: 1,
        paymentPk: PrivateKey.fromWif(fundPrivKey),
        ordPk: PrivateKey.fromWif(privKey),
    })).tx;

    await tx.broadcast();
};

const getLatestFromOutpoint = async (outpoint: string): Promise<string> => {
    try {
        const response = await fetch(`https://ordinals.gorillapool.io/api/inscriptions/${origin}/latest`);
        if (response.status !== 200) {
            throw new Error('Failed to fetch data from GorilaPool API');
        }

        return (await response.json()).outpoint;
    } catch {
        throw new Error('Failed to fetch data from GorilaPool API');
    }
};

const fetchScript = async (outpoint: string): Promise<string> => {
    try {
        const response = await fetch(`https://ordinals.gorillapool.io/api/txos/${outpoint}?script=true`);
        if (response.status !== 200) {
            throw new Error('Failed to fetch data from GorilaPool API');
        }

        return (await response.json()).script;
    } catch {
        throw new Error('Failed to fetch data from GorilaPool API');
    }
};

const sendOrdinal = async (privKey: string, fundPrivKey: string, toAddress: string, ordinalOutpoint: string): Promise<void> => {
    const tx: Transaction = (await sendOrdinals({
        paymentUtxos: await fetchPayUtxos(privKeyToAddress(fundPrivKey)),
        paymentPk: PrivateKey.fromWif(fundPrivKey),
        satsPerKb: 1,
        ordPk: PrivateKey.fromWif(privKey),
        ordinals: [{
            satoshis: 1,
            txid: (await getLatestFromOutpoint(ordinalOutpoint)).slice(0, 64),
            vout: +(await getLatestFromOutpoint(ordinalOutpoint)).slice(65),
            script: await fetchScript(await getLatestFromOutpoint(ordinalOutpoint)),
        }],
        destinations: [{address: toAddress}],
    })).tx;

    await tx.broadcast();
};

const getBSVPrice = async (): Promise<number> => {
    return (await (await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate')).json()).rate;
};

(window as any).ord = {
    checkIfUserHasOrdinal,
    generatePrivateKey,
    privKeyToPubKey,
    privKeyToAddress,
    pubKeyToAddress,
    getBalanceInSats,
    getTokenBalance,
    sendBsv,
    sendToken,
    sendOrdinal,
    getBSVPrice,
};