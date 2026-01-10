/**
 * Blockchain Contract Configurations
 */
export declare const FRAGMENT_CONTRACT_ADDRESS: string;
export declare const FRAGMENT_CONTRACT_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "id";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "mintFragment";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "user";
        readonly type: "address";
    }];
    readonly name: "checkAllParts";
    readonly outputs: readonly [{
        readonly internalType: "uint256[]";
        readonly name: "";
        readonly type: "uint256[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "user";
        readonly type: "address";
    }, {
        readonly internalType: "uint256[]";
        readonly name: "ids";
        readonly type: "uint256[]";
    }, {
        readonly internalType: "uint256[]";
        readonly name: "amounts";
        readonly type: "uint256[]";
    }];
    readonly name: "burnForAssembly";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
export declare const CAR_CONTRACT_ADDRESS: string;
export declare const CAR_CONTRACT_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }];
    readonly name: "mintCar";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "uint256";
        readonly name: "tokenId";
        readonly type: "uint256";
    }];
    readonly name: "CarMinted";
    readonly type: "event";
}];
//# sourceMappingURL=config.d.ts.map