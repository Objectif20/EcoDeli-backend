import { Controller, Get, Query } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { Transaction, TransactionType } from "./type";

@Controller('client/finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) {}

    @Get('transactions')
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
}