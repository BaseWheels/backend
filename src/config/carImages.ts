/**
 * IPFS Image Mapping for Car NFTs
 * Maps car model names from gacha.ts to their IPFS CIDs
 */

export const CAR_IMAGES: Record<string, string> = {
    // Legendary Cars (Hypercar series)
    "Bugatti Chiron": "bafybeiftaawte4lf5g5ljeps6a72m3rrgkr2vkoh5rbd4gc4flmbywv3te",
    "Koenigsegg Jesko": "bafybeihiponyi6h4erpaq4arbssz3dtluhxavwwclie32mnmwxhfdrzag4",
    "Pagani Huayra": "bafybeiffovnurjkcygzun5x7azy5uemubhpuwevk4dkagorc3goxpf6wv4",

    // Epic Cars (Supercar series)
    "McLaren 720S": "bafybeid6vphk2efhqdm7nsr7ox4shczhmybesrduqoyyeiywp2ya34yxpi",
    "Ferrari F8": "bafybeibgflndkobzbqbjy7zrh3yiadl3iwp5j3z5ck3gv4mi2c4r3m6soe",
    "Lamborghini Huracan": "bafybeignmoxxouqv7ysvyy5tnlmi45ohjogxkh7nxsh7ehji24s5jbz7ra",
    "Porsche 911 Turbo": "bafybeicv5yjfxls2tbxguop4dxah7h5ix5bgjh5xwqxlphjqitf3o2gdpm",

    // Rare Cars (Sport/Luxury series)
    "BMW M3": "bafybeidrz55ebgy7nhrscsa2yt2dr7bldnd3e5k64eld45o42g3y3tejhi",
    "Audi RS6": "bafybeihdnux37rdkcy76rmzysfgoiocxfmqnc6pyotstpxgrjggrym3dzu",
    "Mercedes AMG GT": "bafybeicpnyqoocogohgv64foqkmiygls66cjurz4jjlc4giyg67u3p2m7q",
    "Porsche 911": "bafybeiclehrsxeymjvnxexw6rq3al2eqroonpx7mjtkjcbmydpc56ej7re",
    "Mercedes AMG": "bafybeiac5ujvp55aaiojmavoarpl3daw7rsfw3j63ipg433oog7pumiswq",

    // Common Cars (Economy series)
    "Honda Civic": "bafybeiffsdp6y3kadnk5o424mmqf732uigk6oogsfxwbvefwah3huscr6q",
    "Toyota Corolla": "bafybeiagvpahpjr6wyktxserk75gnosnzy2mpn5qi4yvh2tay26jo4fmfa",
};

/**
 * Get IPFS gateway URL for a car image
 * @param modelName Car model name from database
 * @returns Full IPFS gateway URL or null if not found
 */
export function getCarImageUrl(modelName: string): string | null {
    const cid = CAR_IMAGES[modelName];
    if (!cid) {
        console.warn(`No IPFS image found for car model: ${modelName}`);
        return null;
    }
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Get IPFS URI (ipfs:// protocol) for a car image  
 * @param modelName Car model name from database
 * @returns IPFS URI or null if not found
 */
export function getCarImageIpfs(modelName: string): string | null {
    const cid = CAR_IMAGES[modelName];
    if (!cid) return null;
    return `ipfs://${cid}`;
}
