import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {QueryTreeNode} from "./QueryTreeNode";
import {Section} from "./Section";
// import {Room} from "./Room";
import QueryWhereBuilder from "./QueryWhereBuilder";
import PerformQueryHelper from "./PerformQueryHelper";
import {Room} from "./Room";
import QueryOptionBuilder from "./QueryOptionBuilder";
import QueryTransformationBuilder from "./QueryTransformationBuilder";

export default class QueryBuilder{

	private id_str: string;
	private type_str: InsightDatasetKind|undefined = undefined;
	private applyKey_col: string[];
	private whereBuilder: QueryWhereBuilder;
	private optionBuilder: QueryOptionBuilder;
	private transBuilder: QueryTransformationBuilder;
	constructor(){
		this.id_str = "";
		this.applyKey_col = [];
		this.whereBuilder = new QueryWhereBuilder();
		this.optionBuilder = new QueryOptionBuilder();
		this.transBuilder = new QueryTransformationBuilder();
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
		this.whereBuilder.checkWhereTypeKey(parsed.WHERE);
		let where = this.whereBuilder.buildWhere(parsed.WHERE);
		root.addChildren(where);
		this.id_str = this.whereBuilder.getId();
		this.type_str = this.whereBuilder.getType();
		let trans: QueryTreeNode|undefined;
		if(parsed.TRANSFORMATIONS !== undefined){
			this.transBuilder.checkTransformationTypeKey(parsed.TRANSFORMATIONS);
			trans = this.transBuilder.buildTransformation(parsed.TRANSFORMATIONS, parsed.TRANSFORMATIONS.GROUP,
				parsed.TRANSFORMATIONS.APPLY, this.id_str,this.type_str);
			this.applyKey_col = this.transBuilder.getApplyKeyCol();
			root.addChildren(trans);
			if(this.id_str === ""){
				this.id_str =  this.transBuilder.getId();
			}
			if(this.type_str === undefined){
				this.type_str =  this.transBuilder.getType();
			}
		}

		this.optionBuilder.checkOptionTypeKey(parsed.OPTIONS);
		PerformQueryHelper.checkIsNonEmptyArray(parsed.OPTIONS.COLUMNS);
		let options = this.optionBuilder.buildOption(parsed.OPTIONS, parsed.OPTIONS.COLUMNS,
			parsed.OPTIONS.ORDER, this.id_str, this.type_str, this.applyKey_col,
			this.transBuilder.getGroupKeyCol());
		root.addChildren(options);


		return root;

	}

	public getId(){
		return this.id_str;
	}

	public getType(){
		return this.type_str;
	}


}
