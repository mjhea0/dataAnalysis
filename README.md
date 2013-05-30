###getSummary.js

A quick project to import some data, aggregate it, and export it again.


Written in NodeJS utilizing Mongoose to learn more about aggregation

(and of course to stretch my asynchronous abilities)


See package.json for dependencies

With Node 0.10.x installed, run "npm install" to install required modules


```
Usage: node getSummary.js [file]
       node getSummary.js [file] [options]

Options:
 -a, --active [file]   Read an additional file with information about the 
                       active site users.

Input Files:
 signups               Pipe-delimited file with dates and number of signups
                       per date.
 active_users          Pipe-delimited file with dates and number of active
                       users per date.
```
