import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	// private static facade: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		// Server.facade = new InsightFacade();
		// let sections = getContentFromArchives("pair.zip");
		// const res =  Server.facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		// this.express.get("/echo/:msg", Server.echo);

		this.express.put("/dataset/:id/:kind", Server.addDataSet);
		this.express.delete("/dataset/:id", Server.deleteDataSet);
		this.express.post("/query", Server.performQuery);
		this.express.get("/datasets", Server.listDatasets);

		this.express.get("/query/:fName/:lName", Server.getProfCourses);
		this.express.get("/queryForBestProf/:dept/:id/:year", Server.getBestProf);
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private static performQuery(req: Request, res: Response) {
		try {
			console.log(`Server::performQuery(..) - params: ${JSON.stringify(req.params)}`);
			const response =  new InsightFacade().performQuery(req.body).then((arr)=>{
				res.status(200).json({result: arr});
			}).catch((err)=>{
				res.status(400).json({error:  String(err)});
			});
		} catch (err) {
			res.status(400).json({error:  String(err)});
		}
	}

	private static listDatasets(req: Request, res: Response) {
		try {
			console.log("Server::listDatasets(..)");
			const response =  new InsightFacade().listDatasets().then((arr)=>{
				res.status(200).json({result: arr});
			}).catch((err)=>{
				res.status(400).json({error:  String(err)});
			});
		} catch (err) {
			res.status(400).json({error:  String(err)});
		}
	}

	private static addDataSet(req: Request, res: Response) {
		try {
			console.log(`Server::addDataSet(..) - params: ${JSON.stringify(req.params)}`);
			let kind: InsightDatasetKind;
			if (req.params.kind === "sections" ) {
				kind = InsightDatasetKind.Sections;
			} else if (req.params.kind === "rooms") {
				kind = InsightDatasetKind.Rooms;
			} else {
				throw new Error("Kind is invalid.");
			}
			const response = new InsightFacade().addDataset(req.params.id,req.body.toString("base64"),kind)
				.then((result) => {
					res.status(200).json({result: result});
				})
				.catch((err) => {
					console.log(err);
					res.status(400).json({error: String(err)});
				});
		} catch (err) {
			res.status(400).json({error: String(err)});
		}
	}

	private static deleteDataSet(req: Request, res: Response) {
		try {
			console.log(`Server::deleteDataSet(..) - params: ${JSON.stringify(req.params)}`);
			const response = new InsightFacade().removeDataset(req.params.id)
				.then((result) => {
					res.status(200).json({result: result});
				})
				.catch((err) => {
					if (err.message === "The input id did not exist!") {
						res.status(404).json({error: String(err)});
					} else {
						res.status(400).json({error: String(err)});
					}
				});
		} catch (err) {
			res.status(400).json({error: String(err)});
		}
	}

	public static getProfCourses(req: Request, res: Response){
		let query = {
			WHERE: {
				IS: {
					sections_instructor: req.params.lName + ", " + req.params.fName
				}},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_id",
					"sections_title",
					"sections_year"
				],
				ORDER: {
					dir: "DOWN",
					keys: [
						"sections_year", "sections_dept"
					]}},
			TRANSFORMATIONS: {
				GROUP: [
					"sections_dept",
					"sections_id",
					"sections_title",
					"sections_year"
				],
				APPLY: [
					{
						i: {
							COUNT: "sections_id"
						}
					}
				]
			}
		};

		try{
			console.log(`Server::getProfCourses(..) - params: ${JSON.stringify(req.params)}`);
			let facade =  new InsightFacade();
			facade.performQuery(query)
				.then((result)=>{
					// console.log(result);
					res.status(200).json({result: result});
				}).catch((err)=>{
					// console.log(err);
					res.status(400).json({error: String(err)});
				});
		} catch (err) {
			res.status(400).json({error: String(err)});
		}
	}

	public static getBestProf(req: Request, res: Response) {
		let query = {
			WHERE: {
				AND: [
					{
						IS: {
							sections_dept: req.params.dept
						}
					}, {
						IS: {
							sections_id: req.params.id
						}
					},
					{
						EQ: {
							sections_year: parseInt(req.params.year, 10)
						}},
					{
						NOT: {
							IS: {
								sections_instructor: ""
							}}}]},
			OPTIONS: {
				COLUMNS: [
					"sections_avg",
					"sections_instructor",
					"sections_uuid"
				],
				ORDER: {
					dir: "DOWN",
					keys: [
						"sections_avg"
					]
				}
			}
		};
		try{
			console.log(`Server::getBestProf(..) - params: ${JSON.stringify(req.params)}`);
			let facade =  new InsightFacade();
			facade.performQuery(query)
				.then((result)=>{
					res.status(200).json({result: result});
				}).catch((err)=>{
					res.status(400).json({error: String(err)});
				});
		} catch (err) {
			res.status(400).json({error: String(err)});
		}
	}
}
