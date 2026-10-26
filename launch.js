
function Common_GetAjaxData(strUrl, fnSucceedCallback, fnErrorCallback)
{
    if ( ("string" == typeof(strUrl)) && (strUrl.length > 0) )
    {
        var strMyUrl = "../" + strUrl + "";
		
		$.ajax({
			url: strMyUrl,
			async: false,
			type: "GET",
			error: function(XMLHttpRequest, textStatus)
			{
			    try
			    {
				if (jQuery.isFunction(fnErrorCallback))
				{
				    fnErrorCallback(XMLHttpRequest, textStatus);
				}
			    }
			    catch (exception)
			    {

			    }
			},
			success: function(data)
			{
			    var xml;
			    if ( ("string" == typeof(data)) || ("number" == typeof(data)) ) 
			    {
					if (!window.ActiveXObject)
					{
					    var parser = new DOMParser();
					    xml = parser.parseFromString(data, "text/xml");
					}
					else 
					{
					    xml = new ActiveXObject("Microsoft.XMLDOM");
					    xml.async = false;
					    xml.loadXML(data);
					}
			    }
			    else 
			    {
			        xml = data;
			    }
			
			    if ("function" == typeof(fnSucceedCallback)) 
			    {
			        fnSucceedCallback($(xml));
			    }
			    else 
			    {

			    }
			}
		});
    }
}

$(document).ready(function(){

    RedirectBrowser();
        
});

function GetDeviceStatus()
{
    var strUrl = "api/monitoring/status";	
    Common_GetAjaxData(strUrl, SucceedCallbackForGetDeviceStatus, ErrorCallbackForGetDeviceStatus);
	
    function ErrorCallbackForGetDeviceStatus(XMLHttpRequest, textStatus)
    {

    }
    
	function SucceedCallbackForGetDeviceStatus($xmlDoc)
	{
		if ("object" == typeof($xmlDoc))
		{
			var strConnectStatus = $xmlDoc.find("ConnectionStatus").text();
			
			if ("string" == typeof(strConnectStatus))
			{
				if ("901" == strConnectStatus)
				{
					GetOperatorHomePage();
				}
			}
		}
	}
}

function GetOperatorHomePage()
{
    function ErrorCallbackForGetOperatorHomePage(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForGetOperatorHomePage($xmlDoc)
    {
    	var strRedirection = "";
    	var strHomepage = "";
    	
    	if ("object" == typeof($xmlDoc))
    	{
    		strRedirection = $xmlDoc.find("EnableRedirection").text();
    		
    		if ("string" == typeof(strRedirection))
    		{
    			if ("1" == strRedirection)
    			{
    				strHomepage = $xmlDoc.find("Homepage").text();
    				if ( ("string" == typeof(strHomepage)) && (strHomepage.length > 0) )
    				{
    					PopupOperatorHomePage(strHomepage);
    				}
    			}
    		}
    	}
    }
    
    function PopupOperatorHomePage(strHomepage)
    {
    	var strUrl = "";
    	if ( ("string" == typeof(strHomepage)) && (strHomepage.length > 0) )
    	{
    		if (strHomepage.length > 4)
    		{
    			strHomepage = strHomepage.toLowerCase();
    			if ("http" == strHomepage.substring(0, 4))
    			{
    				strUrl = strHomepage;
    			}
    			else
    			{
    				strUrl = "http://" + strHomepage;
    			}
    		}
    		else
    		{
    			strUrl = "http://" + strHomepage;
    		}
    	}
    
    	if (strUrl.length > 0)
    	{
    		window.open(strUrl);
    	}
    }
    
    var strUrl = "api/redirection/homepage";
    Common_GetAjaxData(strUrl, SucceedCallbackForGetOperatorHomePage, ErrorCallbackForGetOperatorHomePage);
}

function CheckPinState()
{
    var strUrl = "api/pin/status";
    Common_GetAjaxData(strUrl, SucceedCallbackForCheckPinState, ErrorCallbackForCheckPinState);

    function ErrorCallbackForCheckPinState(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForCheckPinState($xmlDoc)
    {
    	if ("object" === typeof($xmlDoc))
    	{
	        var strPinState = $xmlDoc.find("SimState").text();
	    	
	    	if ("255" === strPinState)
	    	{
	    	    window.location.replace("home.htm?startPage=sim-error");
	    	}
	    	else if ("257" === strPinState)
	    	{
	    	    window.location.replace("home.htm");
	    	}
	    	else if ("260" === strPinState)
	    	{
	    	    window.location.replace("home.htm?startPage=pin-required");
	    	}
	    	else if ("261" === strPinState)
	    	{
		    	var strPukTimes = $xmlDoc.find("SimPukTimes").text();
		    	if ("0" === strPukTimes)
		    	{
		    	    window.location.replace("home.htm?startPage=puk-lock");
		    	}
		    	else
		    	{
		    	    window.location.replace("home.htm?startPage=puk-required");
		    	}
	    	}
	    	else
	    	{
	    	    window.location.replace("home.htm");
	    	}
    	}
    }
}

function CheckSimLockState()
{
    var bSimLock = false;

    var strUrl = "api/pin/simlock";
    Common_GetAjaxData(strUrl, SucceedCallbackForCheckSimLockState, ErrorCallbackForCheckSimLockState);

    function ErrorCallbackForCheckSimLockState(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForCheckSimLockState($xmlDoc)
    {
    	if ("object" == typeof($xmlDoc))
    	{
	    	var strSimLockEnable = $xmlDoc.find("SimLockEnable").text();
	    	
	    	if ("1" == strSimLockEnable)
	    	{
	    	    bSimLock = true;
	    	}
    	}
    }

    return bSimLock;
}

function GetDevicePinState()
{
    var strRedirectPageName = "";
    
    var bSimLockEnable = CheckSimLockState();
    if (bSimLockEnable)
    {
        strRedirectPageName = "sim-error";
    }
    else
    {
        strRedirectPageName = HW_GetPinStatusPage();
    }
    
    return strRedirectPageName;
}

function GetDeviceAndPinStatus()
{
    var strRedirectPageName = "";
    
    var bSimLockEnable = CheckSimLockState();
    if (bSimLockEnable)
    {
        strRedirectPageName = "network-locked";
    }
    else
    {
        strRedirectPageName = HW_GetPinStatusPage();
    }
    
    return strRedirectPageName;
}

function HW_GetPinStatusPage()
{
    var strHtml = "";
    
    var strUrl = "api/pin/status";
    Common_GetAjaxData(strUrl, SucceedCallbackForCheckPinState, ErrorCallbackForCheckPinState);

    function ErrorCallbackForCheckPinState(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForCheckPinState($xmlDoc)
    {
    	if ("object" == typeof($xmlDoc))
    	{
	    	var strPinState = $xmlDoc.find("SimState").text();
	    	
	    	if ("255" == strPinState)
	    	{
	    	    strHtml = "sim-error";
	    	}
	    	else if ("257" == strPinState)
	    	{
	    	    strHtml = "index";
	    	}
	    	else if ("260" == strPinState)
	    	{
	    	    strHtml = "pin-required";
	    	}
	    	else if ("261" == strPinState)
	    	{
	    	    var strPukTimes = $xmlDoc.find("SimPukTimes").text();
	    	    if ("0" == strPukTimes)
	    	    {
	    	        strHtml = "sim-lock";
	    	    }
	    	    else
	    	    {
	    	        strHtml = "puk-required";
	    	    }
	    	}
	    	else
	    	{
	    	    strHtml = "index";
	    	}
    	}
    }
    
    return strHtml;
}

function RedirectBrowser()
{
    var vConvergedStatus = HW_GetConvergedStatus();
    if (null == vConvergedStatus)
    {
        window.location.replace("home.htm");
    }
    else
    {
        if (255 == vConvergedStatus.nSimState)
        {
            window.location.replace("home.htm?startPage=sim-error");
        }
        else if (260 == vConvergedStatus.nSimState)
        {
            window.location.replace("home.htm?startPage=pin-required");
        }
        else if (261 == vConvergedStatus.nSimState)
        {
            var vSimStatus = HW_GetSIMStatus();
            if (null != vSimStatus)
            {
                if ( (261 == vSimStatus.nSimState) && (0 == vSimStatus.nSimPukTimes) )
                {
                    window.location.replace("home.htm?startPage=puk-lock");
                }
                else
                {
                    window.location.replace("home.htm?startPage=puk-required");
                }
            }
            else
            {
                window.location.replace("home.htm?startPage=puk-required");
            }
        }
        else
        {
            if (vConvergedStatus.bSimLockEnable)
            {
                window.location.replace("home.htm?startPage=network-unlock");
            }
            else
            {
                window.location.replace("home.htm");
            }
        }
    }
}

function HW_GetSKUStatus()
{
    var vSKUStatus = null;
    
    var strUrl = "api/device/nv-configuration";
    Common_GetAjaxData(strUrl, SucceedCallbackForGetSKUStatus, ErrorCallbackForGetSKUStatus);
		
    function ErrorCallbackForGetSKUStatus(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForGetSKUStatus($xmlDoc)
    {
		vSKUStatus = DecodeSKUData($xmlDoc);
    }
	
	function DecodeSKUData($xmlDoc)
	{
		var vResponse = {};
		vResponse.nSKUType = -1;
		
		if ( ("object" == typeof($xmlDoc)) && (null != ($xmlDoc)) )
		{	
			var $nodeResponse = $xmlDoc.find("response");
			if (0 < $nodeResponse.size())
			{
				var strSKUType = $nodeResponse.find("SKUType").text();

				if (0 < strSKUType.length)
				{
					var nSKUType = parseInt(strSKUType, 10);
					if (!isNaN(nSKUType))
					{
						vResponse.nSKUType = nSKUType;
					}
				}
				
				return vResponse;
			}
		}
		
		return null;
	}
    
    return vSKUStatus;
}

function HW_GetConvergedStatus()
{
    var vResponse = null;
    
    var strUrl = "api/monitoring/converged-status";
    Common_GetAjaxData(strUrl, SucceedCallbackForGetConvergedStatus, ErrorCallbackForGetConvergedStatus);

    function ErrorCallbackForGetConvergedStatus(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForGetConvergedStatus($xmlDoc)
    {
    	if ("object" == typeof($xmlDoc))
    	{
    	    var vConvergedStatus = {};
    	    vConvergedStatus.nSimState = 257;
    	    vConvergedStatus.bSimLockEnable = false;
    	    
	        var strSimState = $xmlDoc.find("SimState").text();
	        var strSimLockEnable = $xmlDoc.find("SimLockEnable").text();
	    	
	        var nEnable = parseInt(strSimLockEnable, 10);
            if ( (!isNaN(nEnable)) && (1 == nEnable) )
            {
                vConvergedStatus.bSimLockEnable = true;
            }
            else
            {
                vConvergedStatus.bSimLockEnable = false;
            }
            
            var nSimState = parseInt(strSimState, 10);
            if (!isNaN(nSimState))
            {
                if ( (255 == nSimState) ||  (257 == nSimState) || (260 == nSimState) || (261 == nSimState) )
                {
                    vConvergedStatus.nSimState = nSimState;
                }
                else
                {
                    vConvergedStatus.nSimState = 257;
                }
            }
            else
            {
                vConvergedStatus.nSimState = 257;
            }
            
            vResponse = vConvergedStatus;
    	}
    }
    
    return vResponse;
}

function HW_GetSIMStatus()
{
    var vResponse = null;
    
    var strUrl = "api/pin/status";
    Common_GetAjaxData(strUrl, SucceedCallbackForGetSIMStatus, ErrorCallbackForGetSIMStatus);

    function ErrorCallbackForGetSIMStatus(XMLHttpRequest, textStatus)
    {

    }
    
    function SucceedCallbackForGetSIMStatus($xmlDoc)
    {
        if ("object" == typeof($xmlDoc))
        {
            var $nodeResponse = $xmlDoc.find("response");
            if (0 < $nodeResponse.size())
            {
                var strSimState    = $nodeResponse.find("SimState").text();
                var strPinOptState = $nodeResponse.find("PinOptState").text();
                var strSimPinTimes = $nodeResponse.find("SimPinTimes").text();
                var strSimPukTimes = $nodeResponse.find("SimPukTimes").text();
                
                var nSimState    = parseInt(strSimState, 10);
                var nPinOptState = parseInt(strPinOptState, 10);
                var nSimPinTimes = parseInt(strSimPinTimes, 10);
                var nSimPukTimes = parseInt(strSimPukTimes, 10);
                
                if (isNaN(nSimState))
                {
                    nSimState = 257;
                }
                
                if (260 == nSimState)
                {
                    if (isNaN(nSimPinTimes))
                    {
                        nSimPinTimes = 0;
                    }
                }
                
                if (261 == nSimState)
                {
                    if (isNaN(nSimPukTimes))
                    {
                        nSimPukTimes = 0;
                    }
                }
                
                if (259 == nPinOptState)
                {
                    nPinOptState = 1;
                }
                else
                {
                    nPinOptState = 0;
                }
                
                var vSIMStatus = {};
                vSIMStatus.nSimState    = nSimState;
                vSIMStatus.nPinOptState = nPinOptState;
                vSIMStatus.nSimPinTimes = nSimPinTimes;
                vSIMStatus.nSimPukTimes = nSimPukTimes;
                
                vResponse = vSIMStatus;
            }
        }
    }
    
    return vResponse;
}
