interface BuyerFixture {
  email: string;
  token: string;
}
export declare function registerBuyer(
  base: string,
  emailPrefix: string,
): Promise<BuyerFixture>;
export declare function loginAdmin(
  base: string,
  adminEmail: string,
  adminPassword: string,
): Promise<string>;
export declare function getFirstZoneId(base: string): Promise<number>;
export declare function getCheapestProductId(base: string): Promise<number>;
export declare function fundWalletViaWebhook(
  base: string,
  buyerToken: string,
  buyerEmail: string,
  amountKobo: number,
): Promise<string>;
export {};
