/**
 * IPFS Image Mapping for Car NFTs
 * Maps car model names from gacha.ts to their IPFS CIDs
 */

export const CAR_IMAGES: Record<string, string> = {
  // Legendary Cars (Hypercar series)
  "Bugatti Chiron": "bafybeiapbketuc3mqly5iohz24h6gi62h53w57m6uzwu4qdpius2ejcnuq", // 02
  "Koenigsegg Jesko": "bafybeihkf3srlwgm4lkkpu33a2hocppvvj4cjrafx6wzoxojkh7wxl5fw4", // 03
  "Pagani Huayra": "bafybeidhxhya5gp5rg2hu675g7hvmwsjujdfxsxbszdphl5stgtzaeqrx4", // 08

  // Epic Cars (Supercar series)
  "McLaren 720S": "bafybeiht72ord2yxqz3k7mjlodvwqwxaikegux63xlk4lxmq3k6m4slxle", // 14
  "Ferrari F8": "bafybeig2cbbaqldtjfwo4hrxynto6b2ztfn5evtdqpizhz3guwtjpx6fkq", // 07
  "Lamborghini Huracan": "bafybeigweh7r52ihj56ncbyi3aytf4ocgyl5c43jimyz4lzfl3crlfzjle", // 05
  "Porsche 911 Turbo": "bafybeihrbhdmb7cbddylfw4tkj7dp2ogjecvp6xqapyyxtuzal5gm7ffse", // 01

  // Rare Cars (Sport/Luxury series)
  "BMW M3": "bafkreifvdncaq6uzee46hveddjsbjfb3mz2wgj3acdysvdig7ojhwowhye", // 04
  "Audi RS6": "bafkreifwo63pgegeyrisuclayphymkpbnijjz7eyi4p477xec7binuydwq", // 06
  "Mercedes AMG GT": "bafkreic64x7eb4tujseu2eurarihvaoqkckeivxepxsiqt76qyescgv44m", // 11
  "Porsche 911": "bafybeig2fhqfgmhouaw56kvh3peqvjfmhm5ievn2upozbkxfib75mozbve", // 13
  "Mercedes AMG": "bafybeidujjhmpsyxmw2wl3uzl7l42mwbqkq4yiv33vcsgx6kqmnhmtbzmi", // 09

  // Common Cars (Economy series)
  "Honda Civic": "bafkreifhtituk3dyhbpnjdlfmnacpayavkuphucbp6vuvk3jbup3fkdkqi", // 10
  "Toyota Corolla": "bafkreif2rpew3cdr3xf4ofgepvhg23qquag75eeaqrlzl2e2v7kiueq2z4", // 12
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
