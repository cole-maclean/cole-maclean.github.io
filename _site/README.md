## Fengzhichu Theme

A jekyll theme for personal blog which based on [Type theme](https://github.com/rohanchandra/type-theme) and [ibireme's blog](http://blog.ibireme.com). Add several useful features. Fengzhichu Theme is powered by [Jekyll](http://jekyllrb.com/) and freely
hosted in [Github pages](https://pages.github.com/). Theme from [Fengzhichu](https://github.com/fengzhichu/fengzhichu-theme).


## API Configuration
Authentication credentials for github and pocket access are stored in a file "secrets.ini". This file needs to be created in the root directory of this repo. Example configuration to include in this file is outlined below. The process for obtaining a Pocket consumer and access token can be found [here](https://github.com/gzb1985/pocketpy)

[Github]  
username: your username  
password: your password  

[Pocket]  
consumer_key: your consumer key  
access_token: your access token

## Data Scrapping Scripts

Github and Pocket datascrapping and structuring scripts are contained in main.py. Running main.py will run the routines to collect github and pocket data, then structure and save the data in the required format for visualization. Data for both github and Pocket are stored as dictionaries keyed on "hourly", "daily", "monthly" or "yearly". Each key contains a list of tuples in the format: [timestamp,repo or media type,tag,count] with counts summarized to the resolution of the items dictionary key. Github tuples are stored in commit_tag_tuples.json and Pocket tuples are stored in pocket_tag_tuples.json.

## Data Scrapping Cache

The timestamps for the last API pull for both github and Pocket are stored in cache_timestamps.json. Only data occuring after these timestamps will be requested from the github or pocket API. These timestamps are automatically updated after each API data pull when using main.py.

## Github Commit Tagging

Commit tags are parsed from the memo of each commit by indicating a tag keyword by prepending double-dashes to the tag word (ie. "--"). Words that are prepended with "--" are collected into a list and used as the tags for that commit. Example commit memo: "--python --pandas built pandas dataframe for datamunging" This commit would have 2 tags associated with it ["python","pandas"]

## Online Course and Kaggle Data

The learning visualizations are generated from manually entered data contained in course_data.csv and kaggle_data.csv files.


## Copyright & License
Copyright (C) 2015 - Released under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
