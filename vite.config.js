import { resolve, join } from "path";
import fs from "fs";
import { defineConfig, loadEnv } from "vite";
import { Watcher } from "./plugins/watcher";
import { Layout } from "./plugins/layout";
import { Controller } from "./plugins/controller";
import { Imagemin } from "./plugins/imagemin";
import { Linter } from "./plugins/linter";

let input = {};

function fromDir(startPath, filter) {
	if (!fs.existsSync(startPath)) {
		console.log("no dir ", startPath);
		return;
	}

	var files = fs.readdirSync(startPath);
	for (var i = 0; i < files.length; i++) {
		var filename = join(startPath, files[i]);
		var stat = fs.lstatSync(filename);
		if (stat.isDirectory()) {
			fromDir(filename, filter); //recurse
		} else if (filename.indexOf(filter) >= 0) {
			input[filename] = resolve(__dirname, filename);
		}
	}
}

fromDir("src", ".html");

module.exports = defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())
	const base = env.VITE_BASE_URL || '/';

	return {
		root: "src",
		publicDir: '_public',
		base,
		server: {
			open: true
		},
		build: {
			outDir: "../dist",
			lib: {
				name: 'style',
				entry: resolve(__dirname, 'src/_scss/style.js'),
				formats: ['es'],
			},
			rollupOptions: {
				input: input,
				output: {
					preserveModules: true,
					entryFileNames: ({ name: fileName }) => {
						return `${fileName}.js`
					},
					assetFileNames: (data) => {
						var ext = /(?:\.([^.]+))?$/.exec(data.name)[1];
						return `assets/${ext}/${data.name}`
					}
				},
			},
			minify: false,
		},

		plugins: [
			Watcher([
				'**/*.ejs',
				'_public/**',
				'_data/**'
			]),
			Layout({
				dataFile: 'src/_data/data.json',
				ejs: {
					views: ["src"],
				},
			}),
			Controller(),
			Imagemin({
				gifsicle: {
					optimizationLevel: 7,
					interlaced: false,
				},
				optipng: {
					optimizationLevel: 7,
				},
				jpegTran: {
					progressive: true,
				},
				svgo: {
					plugins: [
						{
							name: 'removeViewBox',
						},
						{
							name: 'removeEmptyAttrs',
							active: false,
						},
					],
				},
			}),
			Linter({
				errorOverlay: false,
				htmlhint: {
					files: ['src/**/*.{html,ejs}'],
				},
				stylelint: {
					files: ['src/**/*.{vue,css,scss,sass,less,styl,svelte}'],
					fix: true
				},
				eslint: {
					files: ['src/_public/assets/js/**/*.js'],
					options: {
						fix: true
					}
				}
			}),
		],
	}
});
