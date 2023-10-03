import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import {QueryTreeNode} from "./QueryTreeNode";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
const Logic = ["AND", "OR"];
const Mcomparator = ["LT", "GT", "EQ"];
const Scomparator = ["IS"];
const Negation = ["NOT"];

export default class InsightFacade implements IInsightFacade {

	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}


	public performQuery(query: unknown): Promise<InsightResult[]> {
		let root = this.parseQuery(`{
			"WHERE": {
				"GT": {
					"sections_avg": 97
				}
			},
			"OPTIONS": {
				"COLUMNS": [
					"sections_dept",
					"sections_avg"
				],
				"ORDER": "sections_avg"
			}
		}`);
		// this.parseQuery(query);

		return Promise.resolve([]);
	}


	public parseQuery(query: unknown) {
		// check if query is a valid query
		if(query === null || query === undefined || (typeof query !== "string" && !(query instanceof String))) {
			console.log("line 65 arg error");
			throw new InsightError();
		}
		let parsed;

		try{
			parsed = JSON.parse(String(query));
			console.log(parsed);
		}catch(err){
			console.log("line 74 invalid query string");
			throw new InsightError("invalid query string");
		}

		if(parsed === undefined || parsed.WHERE === undefined || parsed.OPTIONS === undefined){
			console.log("line 79 query error");
			throw new InsightError();
		}
		let root = new QueryTreeNode("ROOT", undefined);
		let where = new QueryTreeNode("WHERE", undefined);
		let options = new QueryTreeNode("OPTIONS", undefined);
		root.addChildren(where);
		root.addChildren(options);
		if(typeof parsed.WHERE !== "object" || parsed.WHERE instanceof Array){
			console.log("line 90 WHERE must be object");
			throw new InsightError();
		}

		// WHERE should only have 1 key
		if(Object.keys(parsed.WHERE).length > 1){
			console.log("line 96 WHERE should only have 1 key ");
			throw new InsightError();
		}

		this.handleWhere(parsed.WHERE, where);

		if(typeof parsed.OPTIONS !== "object" || parsed.OPTIONS instanceof Array){
			console.log("line 103 OPTIONS must be object");
			throw new InsightError();
		}
		this.handleOptions(parsed.OPTIONS, parsed.OPTIONS.COLUMNS, parsed.OPTIONS.ORDER, options);

		console.log(root.toString());
		// console.log(parsed.OPTIONS.COLUMNS);

		return root;

	}


	public handleWhere(query: object, root: QueryTreeNode){
		let temp;
		if(Mcomparator.includes(root.getKey()) || Scomparator.includes(root.getKey())){
			// means we reach the bottom level of the tree
			let key = Object.keys(query)[0];
			let value = query[key as keyof typeof query];
			if (Mcomparator.includes(root.getKey()) ){
				this.checkKeyValue(key,"MCOMPARISON", value);
			}else{
				this.checkKeyValue(key,"SCOMPARISON", value);
			}
			temp = new QueryTreeNode(key, value);
			root.addChildren(temp);
			return;
		}
		for(let key in query){
			if(Mcomparator.includes(key) || Scomparator.includes(key)){
				// should only have 1 key
				let value = query[key as keyof typeof query];
				if(typeof value !== "object") {
					throw new InsightError("line 134 must be object");
				}
				if(Object.keys(value).length !== 1){
					throw new InsightError("line 138 mcomp and scomp should only have 1 key");
				}
				temp = new QueryTreeNode(key, undefined);
				root.addChildren(temp);
				this.handleWhere(value,temp);
			}else if(Logic.includes(key)){
				let value = query[key as keyof typeof query];
				if(!Array.isArray(value) || Array(value).length < 1){
					throw new InsightError("line 147 must be a non-empty array");
				}
				temp = new QueryTreeNode(key, undefined);
				root.addChildren(temp);
				this.handleWhere(value,temp);
			}else if(Negation.includes(key)){
				let value = query[key as keyof typeof query];
				if(typeof value !== "object") {
					throw new InsightError("line 158 NOT must be object");
				}
				temp = new QueryTreeNode(key, undefined);
				root.addChildren(temp);
				this.handleWhere(value,temp);
			}else{
				// encounter an unknown key => invalid query
				return new InsightError("line 164 Invalid filter key");
			}
		}
	}

	/**
	 *
	 * @param query OPTIONS
	 * @param columns COLUMNS
	 * @param order ORDER --optional
	 * @param root the option node
	 * This function checks type in COLUMNS and ORDER clauses, check if they follow EBNF syntax rule
	 * Any violation will throw a new InsightError
	 */
	public handleOptions(query: object, columns: object, order: object, root: QueryTreeNode){
		let temp;
		if(columns === undefined){
			console.log("line 174 OPTIONS missing COLUMNS");
			throw new InsightError();
		}else{
			if (!Array.isArray(columns) || Array(columns).length === 0){
				console.log(columns);

				console.log("line 180  COLUMNS must be a non-empty array");
				throw new InsightError();
			}
			for(let str in columns){
				this.checkKeyValue(columns[str],undefined,undefined);
			}
			temp = new QueryTreeNode("COLUMNS", columns);
			root.addChildren(temp);
		}

		if(order !== undefined){
			if(typeof order !== "string" ){
				console.log("line 189  Invalid ORDER type");
				throw new InsightError();
			}else{
				if(!columns.includes(order)){
					console.log("line 193  ORDER key must be in COLUMNS");
					throw new InsightError();
				}
				temp = new QueryTreeNode("ORDER", order);
				root.addChildren(temp);
			}
		}


	}

	private id_str: string|undefined;


    /**
     *
     * @param str  id_key in string, e.g. sessions_avg
     * @param type can be either "MCOMPARISON", "SCOMPARISON"(where clause) or undefined(options clause)
     * @param value string if "SCOMPARISON", number if "MCOMPARISON", or undefined
     * This function will check if the id_key:value obeys EBNF syntax rules:
     * -  	key:value type match (m/s)
     * - 	id_key contains only one underscore
     * - 	reference only one dataset
     * Any violation will throw new InsightError
     */
	public checkKeyValue(str: string, type: string|undefined, value: string|number|undefined){
		// console.log("____" + str);
		let index = str.search("_");
		if(index === -1) {
			console.log("no underscore in key");
			throw new InsightError();
		}
		if((str.match(/_/g) || []).length > 1){
			console.log("more than 1 underscore in key");
			throw new InsightError();
		}
		if(this.id_str === undefined){
			// first time, set the id
			this.id_str = str.substring(0,index);
		}else if(this.id_str !== str.substring(0,index)){
			console.log("referenced two datasets");
			throw new InsightError();
		}
		console.log(this.id_str);
		str = str.substring(index + 1);

		// 'avg' | 'pass' | 'fail' | 'audit' | 'year'
		if(str === "avg" || str === "pass" || str === "fail" || str === "audit" || str === "year"){
			if(type === "SCOMPARISON"){
				throw new InsightError("Invalid key type");
			}
			if(typeof value === "string"){
				throw new InsightError("Invalid value type");
			}
		}else if(str === "dept" || str === "id" || str === "instructor" || str === "title" || str === "uuid"){
			if(type === "MCOMPARISON"){
				throw new InsightError("Invalid key type");
			}
			if(typeof value === "number"){
				throw new InsightError("Invalid value type");
			}
		}else{
			console.log("Invalid key");
			throw new InsightError("Invalid key");
		}
	}


}
