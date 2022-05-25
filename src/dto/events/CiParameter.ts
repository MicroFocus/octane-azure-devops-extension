export interface CiParameter{
    name:string;
    defaultValue:string;
    type:string;
    choices:string[];
    description:string;
    value?:string;
}