import {Section} from "./Section";
import {Room} from "./Room";
import {QueryTreeNode} from "./QueryTreeNode";
import PerformQueryHelper from "./PerformQueryHelper";
import {InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";

export default class AnswerQueryOption{
	private type: InsightDatasetKind;
	private sections: Section[] = [];
	private rooms: Room[] = [];
	private id: string;
	constructor(s: Section[],r: Room[], type: InsightDatasetKind, id: string){
		this.type = type;
		this.id = id;
		if(this.type === InsightDatasetKind.Sections){
			this.sections = s;
		}else{
			this.rooms = r;
		}
	}

	public getDatasets() {
		if (this.type === InsightDatasetKind.Sections) {
			return this.sections;
		} else {
			return this.rooms;
		}
	}

	public optionNoTrans(n: QueryTreeNode, colIndex: number[], res: InsightResult[]) {
		if(colIndex.length > 5000){
			throw new ResultTooLargeError("The result is too big. Only queries with a maximum of 5000 " +
                "results are supported.");
		}
		if (n.getChildren().length === 2) {
			let column = n.getChildren()[0].getValue();
			let order = n.getChildren()[1];

			if (typeof column === "string" || typeof column === "object") {
				for (let i of colIndex) {
					res.push(this.getDatasets()[i].toJson(column, this.id));
				}
				if (!order.hasChildren()) {
					let key = order.getValue();
					if(typeof key !== "string"){
						throw new InsightError("order type invalid");
					}
					res.sort((a: {[key: string]: any}, b: {[key: string]: any}) => a[
						this.id + "_" + String(key)] > b[this.id + "_" +
                    String(key)] ? 1 : -1);
				}else{
					let dir = order.getChildren()[0].getValue();
					let keys = order.getChildren()[1].getValue();
					if(typeof dir !== "string" || typeof keys !== "object" ||  !Array.isArray(keys)){
						throw new InsightError("order type invalid");
					}
					res = this.handleOrder(dir, keys, res);
				}
			} else {
				throw new InsightError("line 199");
			}
		} else {
			let column = n.getChildren()[0].getValue();
			if (typeof column === "string" || typeof column === "object") {
				for (let i of colIndex) {
					res.push(this.getDatasets()[i].toJson(column,  this.id));
				}
			} else {
				throw new InsightError("line 199");
			}
		}
		return res;
	}

	public handleOrder(dir: string, keys: string[], res: InsightResult[] ){
		let mul: number;
		if(dir === "UP"){
			mul = 1;
		}else{
			mul = -1;
		}
		let index = 0;
		res.sort((a: {[key: string]: any}, b: {[key: string]: any}) =>{
			let key = keys[index];
			if(!PerformQueryHelper.isCustomField(key)){
				key  = this.id + "_" + keys[index];
			}
			if(a[key] > b[key]){
				return mul;
			}else if(a[key] < b[key]){
				return -1 * mul;
			}else{
				let ret: number = 0;
				while(ret === 0 && index < keys.length){
					index = index + 1;
					ret = this.sortArr(keys, index, a[key], b[key]);
				}
				index = 0;
				return mul * ret;

			}
		});
		return res;
	}

	public sortArr(keys: string[], index: number, a: InsightResult, b: InsightResult){
		if(index >= keys.length){
			return 0;
		}
		for(let i = index; i < keys.length; i++){
			let key = keys[i];
			if(a[key] > b[key]){
				return 1;
			}else if(a[key] < b[key]){
				return -1;
			}
		}
		return 0;
	}


}
