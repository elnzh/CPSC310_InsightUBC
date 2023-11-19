import {Section} from "./Section";
import {Room} from "./Room";
import {QueryTreeNode} from "./QueryTreeNode";
import PerformQueryHelper from "./PerformQueryHelper";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class AnswerQueryWhere {
	// private datasets: Section[] | Room[] = [];
	private sections: Section[] = [];
	private rooms: Room[] = [];
	private type: InsightDatasetKind;
	constructor(s: Section[], r: Room[], type: InsightDatasetKind) {
		this.type = type;
		if (this.type === InsightDatasetKind.Sections) {
			this.sections = s;
		} else {
			this.rooms = r;
		}
		// this.datasets = datasets;
	}

	public getDatasetValue(i: number, key: string): string | number {
		if (this.type === InsightDatasetKind.Sections) {
			if (this.sections.length <= i) {
				throw new InsightError();
			}
			return this.sections[i].getValue(key);
		} else {
			if (this.rooms.length <= i) {
				throw new InsightError();
			}
			return this.rooms[i].getValue(key);
		}
	}

	public getDatasetLength() {
		if (this.type === InsightDatasetKind.Sections) {
			return this.sections.length;
		} else {
			return this.rooms.length;
		}
	}

	public handleWhere(node: QueryTreeNode) {
		if (node.hasChildren()) {
			// haven't reached the leaves
			let children = node.getChildren();
			let sectionIndex: number[] = [];
			if (node.getKey() === "AND") {
				for (let i = 0; i < node.getChildrenSize(); i++) {
					// find the same sections among all the children
					let temp = this.handleWhere(children[i]);
					if (sectionIndex.length === 0 && i === 0) {
						sectionIndex.push(...temp);
					} else {
						// find the intersection
						sectionIndex = PerformQueryHelper.findDuplicate(sectionIndex, temp);
					}
				}
			} else if (node.getKey() === "OR") {
				for (let i = 0; i < node.getChildrenSize(); i++) {
					// add all sections among all children
					let temp = this.handleWhere(children[i]);
					if (sectionIndex.length === 0) {
						sectionIndex.push(...temp);
					} else {
						// find the intersection
						sectionIndex = PerformQueryHelper.mergeNoDuplicate(sectionIndex, temp);
					}
				}
			} else if (node.getKey() === "NOT") {
				// console.log(node.getKey());
				if (node.getChildrenSize() === 1) {
					let arr1: number[];
					if (this.type === InsightDatasetKind.Sections) {
						arr1 = [...Array(this.sections.length).keys()]; // array = 0,1....length-1
					} else {
						arr1 = [...Array(this.rooms.length).keys()]; // array = 0,1....length-1
					}
					// let arr1 = [...Array(this.getDataset().length).keys()];  // array = 0,1....length-1
					let temp = this.handleWhere(children[0]);
					sectionIndex = PerformQueryHelper.excludeArr(arr1, temp);
				} else {
					throw new InsightError("127");
				}
			}
			return sectionIndex;
		} else {
			// reach either a mkey or skey
			let sectionIndex = this.answerQueryWhereBaseCase(node);
			return sectionIndex;
		}
	}

	private answerQueryWhereBaseCase(node: QueryTreeNode) {
		let sectionIndex: number[] = [];
		if (node.getKey() === "IS") {
			// console.log("IS");
			let start: boolean = false;
			let end: boolean = false;
			let value: string = String(node.getValue());
			if (value === "*") {
				// console.log("*");
				if (this.type === InsightDatasetKind.Sections) {
					sectionIndex = [...Array(this.sections.length).keys()];
				} else {
					sectionIndex = [...Array(this.rooms.length).keys()];
				}
				// sectionIndex = [...Array(this.getDataset().length).keys()];
				return sectionIndex;
			}
			if (value.startsWith("*")) {
				// console.log("*t");
				value = value.substring(1);
				start = true;
			}
			if (value.endsWith("*")) {
				// console.log("t*");
				value = value.substring(0, value.length - 1);
				// console.log(value);
				end = true;
			}
			// sectionIndex = [...Array(this.getDataset().length).keys()];

			for (let i = 0; i < this.getDatasetLength(); i++) {
				sectionIndex = [...this.handleQueryIs(start, end, i, node, value, sectionIndex)];
			}
		} else {
			sectionIndex = this.extracted(node, sectionIndex);
		}
		return sectionIndex;
	}

	private extracted(node: QueryTreeNode, sectionIndex: number[]) {
		let value = node.getKey();
		for (let i = 0; i < this.getDatasetLength(); i++) {
			if (value === "EQ") {
				if (this.getDatasetValue(i, String(node.getChildrenString()[0])) === node.getValue()) {
					sectionIndex.push(i); // if a section matches, add its index
				}
			} else if (value === "GT") {
				if (this.getDatasetValue(i, String(node.getChildrenString()[0])) > Number(node.getValue())) {
					sectionIndex.push(i); // if a section matches, add its index
				}
			} else if (value === "LT") {
				if (this.getDatasetValue(i, String(node.getChildrenString()[0])) < Number(node.getValue())) {
					sectionIndex.push(i); // if a section matches, add its index
				}
			}
		}
		return sectionIndex;
	}

	private handleQueryIs(
		start: boolean,
		end: boolean,
		i: number,
		node: QueryTreeNode,
		value: string,
		sectionIndex: number[]
	) {
		if (start && end) {
			if (String(this.getDatasetValue(i, String(node.getChildrenString()[0]))).includes(value)) {
				sectionIndex.push(i);
			}
		} else if (start) {
			if (this.getDatasetValue(i, String(node.getChildrenString()[0])).toString().endsWith(value)) {
				sectionIndex.push(i);
			}
		} else if (end) {
			if (String(this.getDatasetValue(i, String(node.getChildrenString()[0]))).startsWith(value)) {
				sectionIndex.push(i);
			}
		} else {
			if (this.getDatasetValue(i, String(node.getChildrenString()[0])) === value) {
				// if a section matches, add its index
				sectionIndex.push(i);
			}
		}

		return sectionIndex;
	}
}
