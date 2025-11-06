#!/bin/bash

set -exuo pipefail
exec 1>/dev/null

function errno(){
	local rcode=${1:-0}
	local lcode=${2:-0}

        echo "Return code at line number ${lcode} was ${rcode}"
	(( ! ${rcode} < 0 )) && exit ${rcode}
	return 0
}

function get_packs(){
         declare p

         p+=("jq")
	 p+=("bc")
               
	 2>/dev/null /usr/bin/dnf --disablerepo=* --enablerepo=baseos install -y ${p[@]}
	 local ret=$?
	 
	 errno ${ret} $LINENO

	 unset p
	return 0
}

function get_latest_release(){
	 local ret=0
         local DEPLOYED_RELEASE=${DEPLOYED_RELEASE:-0}
         local RELEASE=${1:-"stable"}
         local BRANCH=${2:-"headless"}
         local FACTORIO_API_ENDPOINT="https://factorio.com/api/latest-releases"

	 get_packs

         local FACTORIO_LASTEST_RELEASE=$(\
                       /usr/bin/curl -s ${FACTORIO_API_ENDPOINT} \
                       | jq \
		         -r \
			 --arg R "${RELEASE}" \
			 --arg B "${BRANCH}" \
			 '.[$R][$B]'
                        )

	[[ ${DEPLOYED_RELEASE} == ${FACTORIO_LASTEST_RELEASE} ]] && errno 100

	echo "New release available updating config map"

	oc patch configmap factorio-base-config \
		--type=json -p='[
	    {
		    "op": "replace", 
		    "path": "/data/DEPLOYED_RELEASE", 
		    "value": "'${FACTORIO_LASTEST_RELEASE}'"
	    }
        ]'	
        oc start-build buildconfig-factorio-base \
		--follow \
		--env="FACTORIO_BUILD_VERSION=${FACTORIO_LASTEST_RELEASE}"

	return 0
}


function main(){
     get_latest_release
     return  0
}

main



