import {InsightError} from "./IInsightFacade";
import {QueryTreeNode} from "./QueryTreeNode";


const Logic = ["AND", "OR"];
const Mcomparator = ["LT", "GT", "EQ"];
const Scomparator = ["IS"];
const Negation = ["NOT"];
export default class QueryBuilder{

	private id_str: string;
	constructor(){
		this.id_str = "";
	}
	public parseQuery(query: unknown) {
        // check if query is a valid query
		if(query === null || query === undefined || typeof query !== "object" ) {
			console.log("line 65 arg error");
			throw new InsightError();
		}
		let parsed;

		try{
			parsed = JSON.parse(JSON.stringify(query));
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
		if(Object.keys(query).length === 0) {
			throw new InsightError(root.getKey() + " must be object");
		}
		let temp;
		if(Mcomparator.includes(root.getKey()) || Scomparator.includes(root.getKey())){
            // means we reach the bottom level of the tree
			this.handleWhereBaseCase(query, root);
			return;
		}
		for(let key in query){
			if(Mcomparator.includes(key) || Scomparator.includes(key)){
                // should only have 1 key
				let value = query[key as keyof typeof query];
				if(Object.keys(value).length !== 1){
					throw new InsightError("line 138 mcomp and scomp should only have 1 key");
				}
				temp = new QueryTreeNode(key, undefined);
				root.addChildren(temp);
				this.handleWhere(value,temp);
			}else if(Logic.includes(key)){
				let value = query[key as keyof typeof query];
				if(!Array.isArray(value) || Array.from(value).length < 1){
					throw new InsightError("line 147 must be a non-empty array");
				}
				temp = new QueryTreeNode(key, undefined);
				root.addChildren(temp);
				const len = Array.from(value).length;
				for(let i = 0; i < len; i++){
					this.handleWhere(value[i],temp);
				}
			}else if(Negation.includes(key)){
				let value = query[key as keyof typeof query];
				if(typeof value !== "object" || Array.isArray(value)) {
					throw new InsightError("line 158 NOT must be object");
				}
				temp = new QueryTreeNode(key, undefined);
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

    /**
     *
     * @param query OPTIONS
     * @param columns COLUMNS
     * @param order ORDER --optional
     * @param root the option node
     * This function checks type in COLUMNS and ORDER clauses, check if they follow EBNF syntax rule
     * Any violation will throw a new InsightError
     */
	public handleOptions(options: object, columns: object, order: object, root: QueryTreeNode){
		for(let key in options){
			if(key !== "COLUMNS" && key !== "ORDER"){
				throw new InsightError("Invalid keys in OPTIONS");
			}
		}
		let temp;
		if(columns === undefined){
			console.log("line 174 OPTIONS missing COLUMNS");
			throw new InsightError();
		}else{
			if (!Array.isArray(columns) || Array.from(columns).length === 0){
				console.log(columns);
				console.log("line 180  COLUMNS must be a non-empty array");
				throw new InsightError();
			}
			let newCol = [];
			for(let str in columns){
				let tempCol = this.checkKeyValue(columns[str],undefined,undefined);
				newCol.push(tempCol);
			}
			temp = new QueryTreeNode("COLUMNS", newCol);
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
				let index = String(order).search("_");
				let str;
				if(index === -1) {
					throw new InsightError("no underscore in order");
				}else{
					str = String(order).substring(index + 1);
					temp = new QueryTreeNode("ORDER", str);
					root.addChildren(temp);
				}

			}
		}
	}

    /**
     *
     * @param str  id_key in string, e.g. sessions_avg
     * @param type can be either "MCOMPARISON", "SCOMPARISON"(where clause) or undefined(options clause)
     * @param value string if "SCOMPARISON", number if "MCOMPARISON", or undefined
     * @return key wuthout id
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
			throw new InsightError("no underscore in key");
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
			console.log("Invalid key");
			throw new InsightError("Invalid key");
		}
		return str; // value without id
	}

	public getId(){
		return this.id_str;
	}


}
