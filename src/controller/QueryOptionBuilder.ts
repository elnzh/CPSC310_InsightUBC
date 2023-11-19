import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {QueryTreeNode} from "./QueryTreeNode";
import {Section} from "./Section";
import {Room} from "./Room";
import PerformQueryHelper from "./PerformQueryHelper";

export default class QueryOptionBuilder {
	private options: QueryTreeNode;
	private id: string;
	private type: InsightDatasetKind | undefined = undefined;
	private applyKey: string[];
	private groupKey: string[];
	constructor() {
		this.options = new QueryTreeNode("OPTIONS", undefined);
		this.id = "";
		this.applyKey = [];
		this.groupKey = [];
	}

	public checkOptionTypeKey(parsedOption: any) {
		if (typeof parsedOption !== "object" || parsedOption instanceof Array) {
			// console.log("line 103 OPTIONS must be object");
			throw new InsightError();
		}
	}

	public buildOption(
		options: object,
		columns: string[],
		order: object | string,
		id: string,
		type: InsightDatasetKind | undefined,
		applyCol: string[],
		groupCol: string[]
	) {
		this.id = id;
		this.type = type;
		this.applyKey = applyCol;
		this.groupKey = groupCol;
		for (let key in options) {
			if (key !== "COLUMNS" && key !== "ORDER") {
				throw new InsightError("Invalid keys in OPTIONS");
			}
		}
		this.handleOptions(options, columns, order, this.options);
		return this.options;
	}

	public handleOptions(options: object, columns: string[], order: object | string, root: QueryTreeNode) {
		let col = this.buildColumn(columns);
		root.addChildren(col);

		if (order !== undefined) {
			if (typeof order === "string") {
				root = this.handleOrderStr(order, columns, root);
			} else if (typeof order === "object") {
				root = this.handleOrderObj(order, columns, root);
			} else {
				throw new InsightError("Invalid ORDER type");
			}
		}
	}

	public buildColumn(columns: string[]) {
		let newCol = [];

		for (let str in columns) {
			let tempCol = this.checkKeyValue(columns[str], undefined, undefined);
			newCol.push(tempCol);
		}
		return new QueryTreeNode("COLUMNS", newCol);
	}

	private handleOrderStr(order: string, columns: string[], root: QueryTreeNode) {
		if (!columns.includes(order)) {
			// console.log("ORDER key must be in COLUMNS");
			throw new InsightError();
		}
		let str = this.getOrderKeyNoUnderScore(String(order));
		let temp = new QueryTreeNode("ORDER", str);
		root.addChildren(temp);
		return root;
	}

	private handleOrderObj(order: object, columns: string[], root: QueryTreeNode) {
		let temp: QueryTreeNode;

		let hasDir = false;
		let hasKeys = false;

		temp = new QueryTreeNode("ORDER", undefined);
		for (let key in order) {
			if (key === "dir") {
				hasDir = true;
				let dir = order[key as keyof typeof order];
				if (typeof dir !== "string") {
					throw new InsightError("Invalid dir type in ORDER");
				} else if (dir !== "UP" && dir !== "DOWN") {
					throw new InsightError("Invalid dir value in ORDER");
				} else {
					let dirNode = new QueryTreeNode("dir", dir);
					temp.addChildren(dirNode);
				}
			} else if (key === "keys") {
				hasKeys = true;
				let keys = order[key as keyof typeof order];
				PerformQueryHelper.checkIsNonEmptyArray(keys);
				let tempArr: string[] = [];
				for (let k in Array(keys)) {
					if (!columns.includes(keys[k])) {
						// console.log(keys);
						// console.log(k);
						throw new InsightError("ORDER key must be in COLUMNS");
					} else {
						let str = this.getOrderKeyNoUnderScore(keys[k]);
						tempArr.push(str);
					}
				}
				let keysNode = new QueryTreeNode("keys", tempArr);
				temp.addChildren(keysNode);
			} else {
				throw new InsightError("Invalid keys in ORDER");
			}
		}
		if (hasDir && hasKeys) {
			root.addChildren(temp);
			return root;
		} else {
			throw new InsightError("Must have both dir and keys in ORDER");
		}
	}

	public checkKeyValue(str: string, type: string | undefined, value: string | number | undefined) {
		// can be either mkey, skey or applykey
		let index = str.search("_");
		if (index === -1) {
			if (this.applyKey.includes(str)) {
				// in applykey
				return str;
			} else {
				throw new InsightError("Invalid key neither applykey nor mkey/skey");
			}
		}
		if ((str.match(/_/g) || []).length > 1) {
			throw new InsightError("more than 1 underscore in key");
		}

		// has only one underscore, check id
		if (this.id === "") {
			this.id = str.substring(0, index);
		} else if (this.id !== str.substring(0, index)) {
			throw new InsightError("referenced two datasets");
		}
		str = str.substring(index + 1);

		if (this.groupKey.length !== 0 && !this.groupKey.includes(str)) {
			throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
		}
		// check type
		let currType = PerformQueryHelper.checkKeyType(str);
		if (typeof currType === "string") {
			if (this.type === undefined) {
				this.type = currType;
			} else if (this.type !== currType) {
				throw new InsightError("OPTIONS has invalid value type");
			}
		} else {
			throw new InsightError("WHERE has invalid value type");
		}
		return str; // value without id
	}

	public getOrderKeyNoUnderScore(order: string) {
		let index = order.search("_");
		let str;
		if (index === -1) {
			str = order;
		} else {
			str = order.substring(index + 1);
		}
		return str;
	}

	public getId() {
		return this.id;
	}

	public getType() {
		return this.type;
	}
}
