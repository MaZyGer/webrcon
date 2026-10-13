
app.controller( 'ChatController', ChatController );

function ChatController( $scope, rconService, $timeout )
{
	$scope.Output = [];
    
    $scope.Messages = [];
    $scope.Users = [];
    $scope.UserIds = [];
    $scope.SelectedUser = "";
    $scope.ShowServerMessages = true;
    
    $scope.UseAdvancedMessage = false;
    $scope.MessageSender = "Server";
    $scope.MessageType = 5;

    $scope.MessageTypes = [
        { Id: 0, Name: "Normal" },
        { Id: 1, Name: "Error" },
        { Id: 2, Name: "Warning" },
        { Id: 3, Name: "Information" },
        { Id: 4, Name: "Whisper" },
        { Id: 5, Name: "ServerInfo" },
        { Id: 6, Name: "Chatter" },
        { Id: 7, Name: "Economy" }
    ];
        
    $scope.ShouldShow = function(msg)
    {
        if (msg.IsPlayerEvent)
            return true;

        if (!$scope.ShowServerMessages && msg.IsServer)
            return false;

        if ($scope.SelectedUser && msg.Username !== $scope.SelectedUser)
            return false;

        return true;
    }
    
    $scope.ApplyFilter = function()
    {
        $scope.Output = $scope.Messages.filter(function(msg) {
            return $scope.ShouldShow(msg);
        });

        $scope.ScrollToBottom();
    }

    // old
	// $scope.SubmitCommand = function ()
	// {
		// rconService.Command( "say " + $scope.Command, 1 );
		// $scope.Command = "";
	// }

    $scope.SubmitCommand = function ()
    {
        if (!$scope.Command)
            return;

        if ($scope.UseAdvancedMessage)
        {
            var sender = SanitizeCommandArgument($scope.MessageSender || "Server");
            var type = SanitizeCommandArgument($scope.MessageType);
            var input = $scope.Command;
            
            var command = `message "${sender}" "${type}" ${input}`;
            
            rconService.Command(command, 1);
        }
        else
        {
            console.log("say " + $scope.Command);
            rconService.Command("say " + $scope.Command, 1);
        }

        $scope.Command = "";
    }

	$scope.$on( "OnMessage", function ( event, msg )
	{
		if ( msg.Type !== "Chat" ) return;
        
        $scope.OnMessage(ParseChatMessage(msg.Message));
	});

	$scope.OnMessage = function(msg)
    {
        msg.Message = stripHtml(msg.Message);
        msg.Username = stripHtml(msg.Username);

        msg.Avatar = "";

        // Funktioniert mit 0 UND "0"
        msg.IsServer = String(msg.UserId) === "0";

        msg.IsPlayerEvent =
            /^Player (.+?) (joined|left) the (Server|galaxy)$/i.test(msg.Message);

        // Steam Avatar nur für Spieler
        if (!msg.IsServer)
        {
            GetSteamAvatar(msg.UserId).then(function(avatar) {
                msg.Avatar = avatar;
                $scope.$applyAsync();
            });
        }

        // Spieler für Filter merken
        if (!msg.IsServer && $scope.Users.indexOf(msg.Username) === -1)
        {
            $scope.Users.push(msg.Username);
            $scope.UserIds.push(msg.UserId);
        }

        // Nachricht speichern
        $scope.Messages.push(msg);
        $scope.Output.push(msg);

        $scope.ApplyFilter();

        if ($scope.isOnBottom()) {
            $scope.ScrollToBottom();
        }
    }

	$scope.ScrollToBottom = function()
	{
		var element = $( "#ChatController .Output" );

		$timeout( function() {
			element.scrollTop( element.prop('scrollHeight') );
		}, 50 );
	}

	$scope.isOnBottom = function()
	{
		// get jquery element
		var element = $( "#ChatController .Output" );

		// height of the element
		var height = element.height();

		// scroll position from top position
		var scrollTop = element.scrollTop();

		//  full height of the element
		var scrollHeight = element.prop('scrollHeight');

		if((scrollTop + height) > (scrollHeight - 10)) {
			return true;
		}

		return false;
	}

	//
	// Calls console.tail - which returns the last 256 entries from the console.
	// This is then added to the console
	//
	$scope.GetHistory = function ()
	{
		rconService.Request( "chat.tail 512", $scope, function ( msg )
		{
            var messages = ParseChatMessage(msg.Message);

            messages.forEach(function(message) {
                $scope.OnMessage(message);
            });

			$scope.ScrollToBottom();
		});
	}

	rconService.InstallService( $scope, $scope.GetHistory )
}

var SteamAvatarCache = {};

function ParseChatMessage(json)
{
    json = json.replace(
        /"UserId"\s*:\s*(\d+)/g,
        '"UserId":"$1"'
    );

    return JSON.parse(json);
}

function GetSteamAvatar(steamid)
{
    if (!steamid || steamid == 0) {
        return Promise.resolve(null);
    }

    // console.log("try get Avatar from " + steamid);
    // Bereits laufende/abgeschlossene Anfrage verwenden
    if (SteamAvatarCache[steamid]) {
        // console.log("Already in the list " + steamid);
        // console.log(SteamAvatarCache[steamid]);
        return SteamAvatarCache[steamid];
    }

    // console.log("Not in the list " + steamid);
    SteamAvatarCache[steamid] = fetch(
        "/getsteamavatar.php?id=" + encodeURIComponent(steamid)
    )
    .then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        // WICHTIG: JSON parsen
        return response.json();
    })
    .then(function(data) {

        // WICHTIG: Nur Avatar zurückgeben
        return data.avatar || null;
    })
    .catch(function(error) {
        console.error("Steam Avatar Error:", steamid, error);
        return null;
    });

    return SteamAvatarCache[steamid];
}

function stripHtml( text )
{
	return text ? String(text).replace( /<[^>]+>/gm, '' ) : '';
}

function SanitizeCommandArgument(value)
{
    if (value == null)
        return "";

    return String(value)
        .replace(/'/g, "")
        .replace(/"/g, "");
}