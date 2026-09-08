import { Controller, Post, Body, Res } from "@nestjs/common";
import { Response } from "express";
import { AdminRegisterService } from "./admin-register.service";

interface AdminRegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  invite_code: string;
}

@Controller("auth/admin")
export class AdminRegisterController {
  constructor(private adminRegisterService: AdminRegisterService) {}

  @Post("register")
  async register(@Body() dto: AdminRegisterDto, @Res() res: Response) {
    const result = await this.adminRegisterService.registerSubAdmin(dto);

    // Set httpOnly cookie for automatic inclusion in subsequent requests
    res.cookie("admin_api_key", result.admin_api_key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      data: {
        user_id: result.user_id,
        email: result.email,
        admin_tier: result.admin_tier,
        admin_api_key: result.admin_api_key,
      },
      message:
        "Admin registered successfully. Save your API key securely as backup.",
    });
  }
}
