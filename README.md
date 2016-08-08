# README #


### What is this repository for? ###

MIP demo server implementation with restify and heroku. Demonstrates also basic database usage.

### How do I get set up? ###

** Clone the repository

git clone https://bitbucket.org/lassehav_oamk/mip_server_demo.git


** create the heroku instance

heroku create somenameforyourserver


** install all the node.js dependencies

npm install


** add postgresql to your application in heroku: 

heroku addons:create heroku-postgresql:hobby-dev


** open command line tool for postgres, create table and insert one record

heroku pg:psql
CREATE TABLE example ("message" text, "user" text);
INSERT INTO example ("message", "user") VALUES ('demotext','demouser’);


** Upload the app to Heroku

git push heroku master



#### Next step is to install a tool like Chrome Postman and try out the routes /hello/something, /dbtest with both GET and POST methods. See the code. ####

* Notice about database problem. iIf you get "no pg_hba.conf entry…” errors, execute this in your command line "heroku config:set PGSSLMODE=require"