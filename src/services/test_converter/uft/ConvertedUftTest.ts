import UftTestParameter from "./UftTestParameter";
import DataTable from "./DataTable";

export default interface ConvertedUftTest {
    _attributes: {
        name: string;
        path: string;
    },
    parameter: UftTestParameter[],
    DataTable?: DataTable
}