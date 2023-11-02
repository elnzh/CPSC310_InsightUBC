export default class PerformQueryHelper {
	public static findDuplicate(arr1: number[], arr2: number[]) {
		return arr1.filter((element) => arr2.includes(element));
	}

	public static mergeNoDuplicate(arr1: number[], arr2: number[]) {
		let arr = [...arr1, ...arr2];
		return [...new Set(arr)];
	}

	public static excludeArr(arr1: number[], ar2: number[]) {
		let arr2 = new Set(ar2);
		return arr1.filter((x) => !arr2.has(x));
	}
}
