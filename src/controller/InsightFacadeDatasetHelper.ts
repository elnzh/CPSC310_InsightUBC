import * as fs from "fs-extra";
import {InsightDatasetKind} from "./IInsightFacade";
import {Section} from "./Section";

export default class InsightFacadeDatasetHelper {
	public static writeToFiles(idAndDatasets: any) {
		fs.ensureDirSync("./data");
		return fs.writeJson("./data/datasets.json", idAndDatasets);
	}

	public static loadFromDisk() {
		if (!fs.existsSync("./data/datasets.json")) {
			return {};
		}
		let diskJson = JSON.parse(fs.readFileSync("./data/datasets.json").toString());
		let ret: {[key: string]: {kind: InsightDatasetKind; data: any[]}} = {};
		Object.keys(diskJson).forEach(function (key) {
			// each id is a key
			let sectionList: Section[] = [];
			ret[key] = {kind: InsightDatasetKind.Sections, data: []};
			ret[key].kind = diskJson[key].kind;
			for (let r of diskJson[key].data) {
				let s = new Section(
					r["uuid"],
					r["id"],
					r["title"],
					r["instructor"],
					r["dept"],
					r["year"],
					r["avg"],
					r["pass"],
					r["fail"],
					r["audit"]
				);
				sectionList.push(s);
			}
			ret[key].data = sectionList;
		});
		return ret;
	}
}
