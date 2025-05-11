import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { DashboardStats, StripeStats, Transaction, TransactionCategory, TransactionType } from "./type";
import { AdminJwtGuard } from "src/common/guards/admin-jwt.guard";

@Controller('client/finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) {}

    @Get('transactions')
    @UseGuards(AdminJwtGuard)
    async getTransactions(
        @Query('name') name?: string,
        @Query('type') type?: TransactionType,
        @Query('year') year?: string,
        @Query('month') month?: string,
        @Query('pageIndex') pageIndex: number = 0,
        @Query('pageSize') pageSize: number = 10
    ): Promise<{data : Transaction[], totalRows: number}> {
        return this.financeService.getTransactions({ name, type, year, month, pageIndex, pageSize });
    }

    @Get('transactions/csv')
    @UseGuards(AdminJwtGuard)
    async getTransactionsCsv(
        @Res() res: Response,
        @Query('startMonth') startMonth?: string,
        @Query('startYear') startYear?: string,
        @Query('endMonth') endMonth?: string,
        @Query('endYear') endYear?: string,
        @Query('categories') categories?: TransactionCategory[]
    ) {
        this.financeService.getCsvFile(res, { startMonth, startYear, endMonth, endYear, categories });
    }

    @Get('stripe')
    @UseGuards(AdminJwtGuard)
    async getStripeStats(
        @Query('period') period?: string,
    ): Promise<StripeStats> {
        return this.financeService.getStripeStats(period)
    }

    @Get('dashboard')
    @UseGuards(AdminJwtGuard)
    async getDashboardStats(): Promise<DashboardStats> {
        return this.financeService.getDashboardStats()
    }

}