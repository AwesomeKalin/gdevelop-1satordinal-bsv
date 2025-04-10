import { Script } from "@bsv/sdk";
import type { NftUtxo } from "js-1sat-ord";
import { Buffer } from "buffer/";

/**
 * Fetches NFT utxos from the API
 * @param {string} address - Address to fetch utxos for
 * @param {string} [collectionId] - Optional. Collection id (collection insciprtion origin)
 * @param {number} [limit=10] - Optional. Number of utxos to fetch. Default is 10
 * @param {number} [offset=0] - Optional. Offset for fetching utxos. Default is 0
 * @param {string} [scriptEncoding="base64"] - Optional. Encoding for the script. Default is base64. Options are hex, base64, or asm.
 * @returns {Promise<Utxo[]>} Array of NFT utxos
 */
export const fetchNftUtxosNoLimit = async (
    address: string,
    collectionId?: string,
    scriptEncoding: "hex" | "base64" | "asm" = "base64",
): Promise<NftUtxo[]> => {
    let url = `https://ordinals.gorillapool.io/api/txos/address/${address}/unspent?`;

    if (collectionId) {
        const query = {
            map: {
                subTypeData: { collectionId },
            },
        };
        const b64Query = Buffer.from(JSON.stringify(query)).toString("base64");
        url += `q=${b64Query}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Error fetching NFT utxos for ${address}`);
    }

    // Returns a BSV20Txo but we only need a few fields
    let nftUtxos = await res.json();

    // Only include 1 satoshi outputs, non listings
    nftUtxos = nftUtxos.filter(
        (u: {
            satoshis: number;
            data: { list: { price: number; payout: string } | undefined } | null;
        }) => u.satoshis === 1 && !u.data?.list,
    );

    const outpoints = nftUtxos.map(
        (utxo: { txid: string; vout: number }) => `${utxo.txid}_${utxo.vout}`,
    );
    // Fetch the scripts up to the limit
    const nftRes = await fetch(`https://ordinals.gorillapool.io/api/txos/outpoints?script=true`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([...outpoints]),
    });

    if (!nftRes.ok) {
        throw new Error(`Error fetching NFT scripts for ${address}`);
    }

    const nfts = (await nftRes.json() || [])

    nftUtxos = nfts.map(
        (utxo: {
            origin: { outpoint: string };
            script: string;
            vout: number;
            txid: string;
        }) => {
            let script = utxo.script;
            if (scriptEncoding === "hex") {
                script = Buffer.from(script, "base64").toString("hex");
            } else if (scriptEncoding === "asm") {
                script = Script.fromHex(Buffer.from(script, "base64").toString("hex")).toASM();
            }
            const nftUtxo = {
                origin: utxo.origin.outpoint,
                script,
                vout: utxo.vout,
                txid: utxo.txid,
                satoshis: 1,
            } as NftUtxo;
            if (collectionId) {
                nftUtxo.collectionId = collectionId;
            }
            return nftUtxo;
        },
    );

    return nftUtxos as NftUtxo[];
};