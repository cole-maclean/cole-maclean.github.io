from github import Github
import configparser
import json
import datetime
import time
import pandas as pd
from pocket import Pocket, PocketException

#obtain API authentication credentials from secrets.ini and iniatialize github and pocket API objects
config = configparser.ConfigParser()
config.read('secrets.ini')

gh_user = config.get('Github', 'username') 
gh_password =  config.get('Github', 'password')

gh = Github(gh_user,gh_password)

pocket_consumer_key = config.get('Pocket', 'consumer_key') 
pocket_access_token =  config.get('Pocket', 'access_token')

p = Pocket(consumer_key=pocket_consumer_key,
           access_token=pocket_access_token)

def load_commit_data():
    with open("commit_data.json",'r') as infile:
        commit_data = json.load(infile)
    return commit_data

def dump_commit_data(data):
    with open('commit_data.json', 'w') as outfile:
        json.dump(data, outfile)

def load_pocket_data():
    with open("pocket_data.json",'r') as infile:
        commit_data = json.load(infile)
    return commit_data

def dump_pocket_data(data):
    with open('pocket_data.json', 'w') as outfile:
        json.dump(data, outfile)

def parse_commit_memo(memo):
	#extract commit tags from memo (words prepended with --, and remove tags and -- from memo)
    tags = [tag.replace('--',"") for tag in memo.split() if tag.startswith('--')]
    for tag in tags:
        memo = memo.replace(tag,"")
    memo = memo.replace('--',"").strip()
    return tags,memo

def get_gh_data():
	with open('cache_timestamps.json', 'r') as infile:
	    cache_timestamps = json.load(infile)
	gh_cache_datetime = datetime.datetime.strptime(cache_timestamps['github'],"%Y-%m-%dT%H:%M:%SZ") #load cached timestamp for github to only request new data

	profile = gh.get_user()
	repos = profile.get_repos()
	commit_data = load_commit_data()
	for repo in repos:
		#Only search through repos whose last push data is after cached timestamp
	    if repo.pushed_at >= gh_cache_datetime:
	        commits = repo.get_commits(since = gh_cache_datetime)
	        for commit in commits:
	            if commit.sha not in commit_data.keys():
	                message = commit.raw_data["commit"]["message"]
	                tags,memo = parse_commit_memo(message)
	                commit_data[commit.sha] = {'timestamp':commit.raw_data['commit']['author']['date'],
	                                   'repo':repo.name,
	                                   'tags':tags,
	                                   'memo':memo,
	                                   'stats':commit.raw_data['stats']}
	                print(tags)
	dump_commit_data(commit_data)
	cache_timestamps['github'] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ") #update cached timestamp with current time
	with open('cache_timestamps.json', 'w') as outfile:
	    json.dump(cache_timestamps, outfile)

def build_github_tag_tuples():
	#summarize commit data by summing the count of commits with each tag occuring in an hour, day, month and year
	commit_data = load_commit_data()
	commit_tag_tuples = []
	for commit,data in commit_data.items():
	    tags = data['tags']
	    for tag in tags:
	        commit_tag_tuples.append((tag,datetime.datetime.strptime(data["timestamp"],"%Y-%m-%dT%H:%M:%SZ"),data["repo"]))
	df = pd.DataFrame(commit_tag_tuples, columns=['tag', 'timestamp', 'repo'])
	df["hour"] = df["timestamp"].apply(lambda s : s.strftime("%Y-%m-%dT%H"))
	df["date"] = df["timestamp"].apply(lambda s : s.date().strftime("%Y-%m-%d"))
	df["month"] = df["timestamp"].apply(lambda s : s.date().strftime("%Y-%m"))
	df["year"] = df["timestamp"].apply(lambda s : s.date().strftime("%Y"))
	hourly_grouped = df.groupby(["hour","repo","tag"])
	daily_grouped = df.groupby(["date","repo","tag"])
	monthly_grouped = df.groupby(["month","repo","tag"])
	yearly_grouped = df.groupby(["year","repo","tag"])
	hourly_df = pd.DataFrame(hourly_grouped.size().reset_index(name = "Group_Count"))
	daily_df = pd.DataFrame(daily_grouped.size().reset_index(name = "Group_Count"))
	monthly_df = pd.DataFrame(monthly_grouped.size().reset_index(name = "Group_Count"))
	yearly_df = pd.DataFrame(yearly_grouped.size().reset_index(name = "Group_Count"))
	hourly_tuples = [tuple(x) for x in hourly_df.values]
	daily_tuples = [tuple(x) for x in daily_df.values]
	monthly_tuples = [tuple(x) for x in monthly_df.values]
	yearly_tuples = [tuple(x) for x in yearly_df.values]
	with open('commit_tag_tuples.json', 'w') as outfile:
	    json.dump({'hourly':hourly_tuples,'daily':daily_tuples,'monthly':monthly_tuples,'yearly':yearly_tuples}, outfile)

def get_pocket_data():
	with open('cache_timestamps.json', 'r') as infile:
	    cache_timestamps = json.load(infile)
	pocket_cache_datetime = cache_timestamps['pocket'] #load cached timestamp for pocket to only request new data

	# Fetch a list of articles
	try:
	     articles = p.retrieve(since=pocket_cache_datetime,detailType="complete")
	except PocketException as e:
	    print(e.message)
	    
	pocket_data = load_pocket_data()
	if articles["list"]:
		for article,data in articles["list"].items():
		        if article not in pocket_data.keys():
		            try:
		                if "tags" in data.keys():
		                    tags = list(data["tags"].keys())
		                else:
		                    tags = []
		                print (tags)
		                if data["has_video"] == "2":
		                    media_type = "video"
		                elif data["has_image"] =="2":
		                    media_type = "image"
		                else:
		                    media_type = "article"            

		                    pocket_data[article] = {'timestamp':data['time_added'],
		                                           'title':data["resolved_title"],
		                                           'tags':tags,
		                                           'media_type':media_type,
		                                           'excerpt':data["excerpt"],
		                                           'word_count':data["word_count"],
		                                           'url':data["resolved_url"]}
		            except KeyError as e:
		                print (str(e) + " not in article data")
	                
	dump_pocket_data(pocket_data)
	cache_timestamps['pocket'] = str(int(time.time())) #update cached timestamp with current time
	with open('cache_timestamps.json', 'w') as outfile:
	    json.dump(cache_timestamps, outfile)

def build_pocket_tag_tuples():
	#summarize pocket data by summing the count of articles with each tag occuring in an hour, day, month and year
	pocket_data = load_pocket_data()
	pocket_tag_tuples = []
	for article,data in pocket_data.items():
	    tags = data['tags']
	    for tag in tags:
	        pocket_tag_tuples.append((tag,datetime.datetime.fromtimestamp(int(data["timestamp"])),data["media_type"]))
	df = pd.DataFrame(pocket_tag_tuples, columns=['tag', 'timestamp', 'media_type'])
	df["hour"] = df["timestamp"].apply(lambda s : s.strftime("%Y-%m-%dT%H"))
	df["date"] = df["timestamp"].apply(lambda s : s.date().strftime("%Y-%m-%d"))
	df["month"] = df["timestamp"].apply(lambda s : s.date().strftime("%Y-%m"))
	df["year"] = df["timestamp"].apply(lambda s : s.date().strftime("%Y"))
	hourly_grouped = df.groupby(["hour","media_type","tag"])
	daily_grouped = df.groupby(["date","media_type","tag"])
	monthly_grouped = df.groupby(["month","media_type","tag"])
	yearly_grouped = df.groupby(["year","media_type","tag"])
	hourly_df = pd.DataFrame(hourly_grouped.size().reset_index(name = "Group_Count"))
	daily_df = pd.DataFrame(daily_grouped.size().reset_index(name = "Group_Count"))
	monthly_df = pd.DataFrame(monthly_grouped.size().reset_index(name = "Group_Count"))
	yearly_df = pd.DataFrame(yearly_grouped.size().reset_index(name = "Group_Count"))
	hourly_tuples = [tuple(x) for x in hourly_df.values]
	daily_tuples = [tuple(x) for x in daily_df.values]
	monthly_tuples = [tuple(x) for x in monthly_df.values]
	yearly_tuples = [tuple(x) for x in yearly_df.values]
	with open('pocket_tag_tuples.json', 'w') as outfile:
	    json.dump({'hourly':hourly_tuples,'daily':daily_tuples,'monthly':monthly_tuples,'yearly':yearly_tuples}, outfile)

#run data pull and structuring scripts
get_gh_data()
build_github_tag_tuples()
get_pocket_data()
build_pocket_tag_tuples()