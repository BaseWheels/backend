import { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    userId: string;
    walletAddress: string;
}
export declare function auth(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map