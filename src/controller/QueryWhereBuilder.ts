import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {QueryTreeNode} from "./QueryTreeNode";
import {Section} from "./Section";
import {Room} from "./Room";
import PerformQueryHelper from "./PerformQueryHelper";

const Logic = ["AND", "OR"];
const Mcomparator = ["LT", "GT", "EQ"];
const Scomparator = ["IS"];
const Negation = ["NOT"];
export default class QueryWhereBuilder{

	private where: QueryTreeNode;
	private id_str: string;
	private type: InsightDatasetKind|undefined = undefined;
	constructor(){
		this.where = new QueryTreeNode("WHERE", undefined);
		this.id_str = "";
	}

	public checkWhereTypeKey(parsedWhere: any){
		if(typeof parsedWhere !== "object" || parsedWhere instanceof Array){
			console.log("WHERE must be object");
			throw new InsightError();
		}

		// WHERE should only have 1 key
		if(Object.keys(parsedWhere).length > 1){
			console.log("WHERE should only have 1 key ");
			throw new InsightError();
		}
	}

	public buildWhere(query: object){
		this.handleWhere(query, this.where);
		return this.where;
	}

	public handleWhere(query: object, root: QueryTreeNode){
		if(typeof query !== "object") {
			throw new InsightError(root.getKey() + " must be object");
		}
		let temp;
		if(Mcomparator.includes(root.getKey()) || Scomparator.includes(root.getKey())){
			// means we reach the bottom level of the tree
			this.handleWhereBaseCase(query, root);
			return;
		}
		for(let key in query){
			temp = new QueryTreeNode(key, undefined);
			if(Mcomparator.includes(key) || Scomparator.includes(key)){
				// should only have 1 key
				let value = query[key as keyof typeof query];
				if(Object.keys(value).length !== 1){
					throw new InsightError("line 138 mcomp and scomp should only have 1 key");
				}
				root.addChildren(temp);
				this.handleWhere(value,temp);
			}else if(Logic.includes(key)){
				let value = query[key as keyof typeof query];
				PerformQueryHelper.checkIsNonEmptyArray(value);
				root.addChildren(temp);
				const len = Array.from(value).length;
				for(let i = 0; i < len; i++){
					this.handleWhere(value[i],temp);
				}
			}else if(Negation.includes(key)){
				let value = query[key as keyof typeof query];
				if(typeof value !== "object" || Array.isArray(value)) {
					throw new InsightError("NOT must be object");
				}
				root.addChildren(temp);
				this.handleWhere(value,temp);
			}else{
				// encounter an unknown key => invalid query
				throw new InsightError("line 164 Invalid filter key");
			}
		}
	}

	private handleWhereBaseCase(query: object, root: QueryTreeNode) {
		let key = Object.keys(query)[0];
		let value = query[key as keyof typeof query];
		let tempKey;

		if (Mcomparator.includes(root.getKey())) {
			tempKey = this.checkKeyValue(key, "MCOMPARISON", value);
		}else{
			tempKey = this.checkKeyValue(key, "SCOMPARISON", value);
		}
		root.setValue(value);
		root.setChildrenString(tempKey);
	}


	public checkKeyValue(str: string, type: string|undefined, value: string|number|undefined){
		let index = str.search("_");
		this.checkKeyValid(str);

		str = str.substring(index + 1);

		if(Section.isMfield(str) || Room.isMfield(str)){
			if(type === "SCOMPARISON"){
				throw new InsightError("Invalid key type");
			}
			if(typeof value === "string"){
				throw new InsightError("Invalid value type");
			}
		}else if(Section.isSfield(str) || Room.isSfield(str)){
			if(type === "MCOMPARISON"){
				throw new InsightError("Invalid key type");
			}
			if(typeof value === "number"){
				throw new InsightError("Invalid value type");
			}
			// check wildcards
			if(typeof value === "string"){
				let len = value.split("*").length - 1;
				// console.log(value + " " + len);
				if(len > 2){
					throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
				}else if(len === 2){
					if(value[0] !== "*" || value[value.length - 1] !== "*"){
						throw new InsightError("Asterisks (*) can only be the first or last characters " +
							"of input strings");
					}
				}else if(len === 1){
					if(value[0] !== "*" && value[value.length - 1] !== "*"){
						throw new InsightError("Asterisks (*) can only be the first or last characters " +
							"of input strings");
					}
				}
			}
		}else{
			throw new InsightError("Invalid key");
		}
		return str; // value without id
	}

	public checkKeyValid(str: string){
		let index = str.search("_");
		if(index === -1){
			throw new InsightError();
		}
		if((str.match(/_/g) || []).length > 1){
			throw new InsightError("more than 1 underscore in key");
		}
		if(this.id_str === ""){
			// first time, set the id
			this.id_str = str.substring(0,index);
		}else if(this.id_str !== str.substring(0,index)){
			throw new InsightError("referenced two datasets");
		}
		str = str.substring(index + 1);
		let currType = PerformQueryHelper.checkKeyType(str);
		if(typeof currType === "string"){
			if(this.type === undefined){
				this.type = currType;
			}else{
				if(this.type !== currType){
					throw new InsightError("WHERE has invalid value type");
				}
			}
		}else{
			throw new InsightError("WHERE has invalid value type");
		}

		return str;
	}

	public getId(){
		return this.id_str;
	}

	public getType(){
		return this.type;
	}


}
