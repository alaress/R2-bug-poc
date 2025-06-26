<?php
require 'vendor/autoload.php';
$client = new Aws\S3\S3Client([
    'version' => 'latest',
    'region'  => getenv('AWS_REGION'),
    'credentials' => [
        'key'    => getenv('AWS_ACCESS_KEY_ID'),
        'secret' => getenv('AWS_SECRET_ACCESS_KEY'),
    ],
    'endpoint' => getenv('AWS_ENDPOINT'),
    'http' => [
        'debug' => true,
    ],
]);
$client->registerStreamWrapper();

$context = stream_context_create([
    's3' => ['seekable' => true]
]);
$start = time();
$bucket = getenv('AWS_BUCKET');
$key = 'export-parent-redacted.csv';
$s3_uri = "s3://$bucket/$key";
$i = 0;
try {
    if ($stream = fopen($s3_uri, 'rb', false, $context)) {
        while (!feof($stream)) {
            $i++;
            $data = fgetcsv($stream, 0);
            usleep(10000);
            //            echo "$i\n";
        }
        if (!feof($stream)) {
            $error = error_get_last();
            echo "ERROR: $error[message]\n";
        }
        print_r($data);
        fclose($stream);
    }
} catch (\Exception $e) {
    echo "EXCEPTION: Time: " . (time() - $start) . "\n$i lines read";
    echo $e->getMessage();
    throw $e;
}
echo "Time: " . (time() - $start) . "\n$i lines read";
