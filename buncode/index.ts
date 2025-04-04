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

(window as any).ord = {
    checkIfUserHasOrdinal
};