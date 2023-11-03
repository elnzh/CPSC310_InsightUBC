import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {QueryTreeNode} from "./QueryTreeNode";
import PerformQueryHelper from "./PerformQueryHelper";

export default class QueryTransformationBuilder{
	private trans: QueryTreeNode;
	private id: string;
	private type: InsightDatasetKind|undefined = undefined;
	private groupKey: string[];
	private applykey: string[];
	constructor() {
		this.trans = new QueryTreeNode("TRANSFORMATIONS", undefined);
		this.id = "";
		this.groupKey = [];
		this.applykey = [];
	}

	public checkTransformationTypeKey(parsedTrans: any){
		if(typeof parsedTrans !== "object" ){
			console.log("Transformations must be object");
			throw new InsightError();
		}
		for(let key in parsedTrans){
			if(key !== "GROUP" && key !== "APPLY"){
				throw new InsightError("Invalid keys in Transformations");
			}
		}
	}

	public buildTransformation(trans: object, group: any, apply: any, id: string, type: InsightDatasetKind|undefined){
		this.id = id;
		this.type = type;
		for(let key in trans){
			if(key !== "GROUP" && key !== "APPLY"){
				throw new InsightError("Invalid keys in TRANSFORMATIONS");
			}
		}
		if(typeof group === undefined || typeof apply === undefined){
			throw new InsightError("Trans");
		}
		// check group apply type
		PerformQueryHelper.checkIsNonEmptyArray(group);
		PerformQueryHelper.checkIsNonEmptyArray(apply);

		this.handleTrans(trans, group, apply);
		return this.trans;
	}

	public handleTrans(trans: object, group: any[], apply: any[]){
		// group
		for(let key in group){
			if(typeof group[key] !== "string"){
				throw new InsightError("Invalid GROUP key type");
			}else{
				this.groupKey.push(this.checkKeyValid(group[key]));
			}
		}
		let groupNode = new QueryTreeNode("GROUP", this.groupKey);
		this.trans.addChildren(groupNode);

		if(!Array.isArray(apply)){
			throw new InsightError("APPLY must be an array");
		}
		if(Array(apply).length < 1){
			throw new InsightError("APPLY must be a non-empty array");
		}
		let applyNode = new QueryTreeNode("APPLY", undefined);

		for(let key of apply){
			if(typeof key !== "object"){
				throw new InsightError("APPLY must be array of objects");
			}else{
				// console.log(key);
				// console.log( Object.keys(key)[0]); // maxseats
				if(Object.keys(key).length !== 1){
					throw new InsightError("Apply body should only have 1 key");
				}
				let applyKeyName = Object.keys(key)[0];
				this.checkApplyKeyNameNoUnderScore(applyKeyName);
				let applyKeyVal = Object.values(key)[0];
				if(typeof applyKeyVal !== "object" && applyKeyVal !== null){
					throw new InsightError("Invalid apply rule target key");
				}
				let token = Object.keys(Object(applyKeyVal))[0];
				let tokenValue = Object.values(Object(applyKeyVal))[0];
				// console.log(token); // COUNT
				// console.log(tokenValue); // rooms_seats
				if(typeof tokenValue !== "string"){
					throw new InsightError("Invalid apply token value");
				}
				this.checkApplyKey(token);
				tokenValue = this.checkKeyValid(tokenValue);
				this.checkApplyTokenValue(token, String(tokenValue));
				let keyNode = new QueryTreeNode(applyKeyName, undefined);
				keyNode.setValue(String(tokenValue));
				keyNode.setChildrenString(token);
				applyNode.addChildren(keyNode);
				this.applykey.push(applyKeyName);
			}
		}
		this.trans.addChildren(applyNode);

	}

	public checkKeyValid(str: string){
		let index = str.search("_");
		if(index === -1){
			throw new InsightError();
		}
		if((str.match(/_/g) || []).length > 1){
			throw new InsightError("more than 1 underscore in key");
		}
		if(this.id === ""){
			this.id = str.substring(0,index);
		}else if(this.id !== str.substring(0,index)){
			throw new InsightError("referenced two datasets");
		}
		str = str.substring(index + 1);
		let type = PerformQueryHelper.checkKeyType(str);
		if(this.type === undefined){
			if(typeof type === undefined){
				throw new InsightError("invalid key in GROUP");
			}else{
				this.type = type;
			}
		}else if(this.type !== type){
			throw new InsightError("invalid key in GROUP");
		}
		return str;
	}

	public checkApplyKey(key: string){
		let col = ["COUNT","MAX", "MIN", "AVG", "COUNT", "SUM"];
		if(!col.includes(key)){
			throw new InsightError("Invalid APPLY token " + key);
		}
	}

	public checkApplyTokenValue(token: string, tokenVal: string){
		if(token !== "COUNT" && PerformQueryHelper.isSfield(tokenVal)){
			throw new InsightError("Invalid key type in " + token);
		}
	}


	public getApplyKeyCol(){
		return this.applykey;
	}

	public getGroupKeyCol(){
		return this.groupKey;
	}

	public checkApplyKeyNameNoUnderScore(str: string){
		let index = str.search("_");
		if(index !== -1){
			throw new InsightError("Cannot have underscore in applyKey");
		}
	}

	public getId(){
		return this.id;
	}

	public getType(){
		return this.type;
	}

}
