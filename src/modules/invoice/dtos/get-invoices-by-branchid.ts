import { ApiProperty } from "@nestjs/swagger";

export class GetInvoicesByBranchIdDto {
    @ApiProperty({
        description: "Branch ID to filter invoices",
    })
    branchId: string;
}