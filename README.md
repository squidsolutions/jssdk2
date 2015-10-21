jssdk2
======

[![Join the chat at https://gitter.im/squidsolutions/jssdk2](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/squidsolutions/jssdk2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

The JSSDK core library (Version 2)

Provides the base services to build an app using the Squid Analyitcs API. 
Exposes the API Data Model as Backbone Models to easely build MVC apps.

Also provides the following core services :
* API configuration
* Authentication management
* Application state management
* Default Filter controller
* Utility methods

## API Configuration

### Setup
The API must be explicitly configured by calling
```
api.setup({
    "clientId" : clientId,
	"apiUrl" : apiUrl,
	"customerId" : customerId,
    "projectId" : projectId,
    "domainId" : domainId,
    "selection" : selection,
    "filtersDefaultEvents" : true,
    "defaultShortcut" : "shortcut",
    "config" : {}
});
```

The arguments are :  
* `clientId` : a required Client Id (ie. the application id)
* `apiUrl` : the API endpoint (default is "api.squidsolutions.com")
* `customerId` : an optional Customer Id
* `projectId` : an optional Project Id,
* `domainId` : an optional Domain Id,
* `selection` : an optional filter selection,
* `filtersDefaultEvents` : if true or non specified, the default filters controller will be used.
* `defaultShortcut` : an optional Shortcut id to retrieve app State from.
* `config`: an optional default configuration (state)

Some of these arguments may also be overridden by setting URL parameters such as :  
https://api.squidsolutions.com/apps/release/squidflow/?apiUrl=api.squidsolutions.com&projectId=squidflow&domainId=usage&customerId=squid  
In addition to this, some extra parameter are supported :  
* `api` : the api branch (dev/staging/release)
* `version` : the api version (4.2)
* `debug` : set the api to debug (e.g. do not redirect on login failure)

### Initialization
After setting-up the API, the init process must take place. 
This process is triggered by calling the API init method :
```
api.init();
```
The init method will check for the user login by fetching the Access Token associated to the Access Code passed as a "code" parameter of the url. 
If user login is granted, the `squid_api.model.login` Model object will be set accordingly. 
It will also fetch for the Customer model object associated to the verified user and set to `squid_api.model.customer`.


## Authentication management
TBD

## Application state management
The api object holds various Models :  

### FiltersModel
`squid_api.model.filters` : the default FiltersModel object (the one used by the FiltersWidget by default).  
Here is a sample FiltersModel :
```json
{
	"selection" : {
	    "facets" : [ {
	        "dimension" : {
	            "id" : {
	                "projectId" : "musicbrainz",
	                "domainId" : "artist",
	                "dimensionId" : "last_updated"
	            },
	            "expression" : {
	                "value" : "TO_DATE('last_updated')"
	            },
                "name" : "Last Updated",
                "oid" : "last_updated", 
                "type": "CONTINUOUS"
	        },
	        "items" : [ {
                	"type" : "i",
                	"lowerBound" : "2008-01-01T23:00:00.000+0000",
                	"upperBound" : "2014-10-06T23:00:00.000+0000"
            	} ],
	        "selectedItems" : [ {
	            "type" : "i",
	            "lowerBound" : "2014-10-05T23:00:00.000+0000",
	            "upperBound" : "2014-10-06T23:00:00.000+0000"
	        } ]
	    } ]
	}
}	
```
## Default Filter controller
If not disabled the following event listeners will be set on api setup :  

```javascript
// check for new filter selection
filters.on('change:userSelection', function() {
    squid_api.controller.facetjob.compute(filters, filters.get("userSelection"));
});

// check for domain change performed
squid_api.model.status.on('change:domain', function(model) {
    var domain = model.get("domain");
    if (domain) {
        me.domain = domain.domainId;
        // launch the filters computation
        filters.set("id", {
            "projectId": model.get("domain").projectId
        });
        filters.setDomainIds([me.domain]);
        squid_api.controller.facetjob.compute(filters);
    } else {
        // reset the domains
        me.domain = null;
        filters.setDomainIds(null);
    }
});
```

## Utility methods
TBD
